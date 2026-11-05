import os
import re
import json
import time
import sys
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify

# The log messages use emoji; on Windows consoles/pipes without UTF-8 they would crash print().
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from dotenv import load_dotenv
from flask_cors import CORS
from helper import extract_interest_rate, tavily_search_tool, TAVILY_ENABLED

load_dotenv()
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app)

# ---- Gemini (only required credential) ----
# Uses a plain Gemini API key from https://aistudio.google.com/apikey — no gcloud / Vertex AI needed.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
# Flash-Lite is fast (~1s/call) and plenty for this app's extraction/classification tasks.
# If a model is overloaded (503), rate-limited (429), timed out, or retired (404), the next one is tried,
# and whichever model last succeeded is tried first on the next call.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_FALLBACK_MODELS = [
    m.strip() for m in os.environ.get(
        "GEMINI_FALLBACK_MODELS", "gemini-flash-lite-latest,gemini-3.5-flash,gemini-flash-latest"
    ).split(",") if m.strip()
]
GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", "30"))
logging.getLogger("google_genai").setLevel(logging.WARNING)  # hide per-call "AFC is enabled" noise
logging.getLogger("httpx").setLevel(logging.WARNING)

_TRANSIENT_MARKERS = ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE", "500", "INTERNAL",
                      "504", "DEADLINE_EXCEEDED",
                      "timed out", "Timeout", "timeout", "ReadError", "ConnectError", "RemoteProtocolError")


class GeminiModel:
    """Small wrapper so the rest of the code can keep calling generate_content(prompt).text"""

    def __init__(self, model_name: str, fallbacks=()):
        self.models = [model_name] + [m for m in fallbacks if m != model_name]
        self._client = None
        self._no_thinking_config = None
        self._thinking_unsupported = set()  # models that reject thinking_budget=0
        self._lock = threading.Lock()

    def _get_client(self):
        if self._client is None:
            if not GOOGLE_API_KEY:
                raise RuntimeError(
                    "GOOGLE_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey "
                    "and put it in backend/.env"
                )
            from google import genai
            from google.genai import types
            self._client = genai.Client(
                api_key=GOOGLE_API_KEY,
                http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_SECONDS * 1000),
            )
            # These tasks don't need "thinking"; turning it off makes calls several times faster.
            self._no_thinking_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        return self._client

    def _call(self, client, model, prompt):
        if model not in self._thinking_unsupported:
            try:
                return client.models.generate_content(model=model, contents=prompt, config=self._no_thinking_config)
            except Exception as e:
                msg = str(e)
                if ("400" in msg or "INVALID_ARGUMENT" in msg) and "think" in msg.lower():
                    self._thinking_unsupported.add(model)  # model can't disable thinking; call it plainly
                else:
                    raise
        return client.models.generate_content(model=model, contents=prompt)

    def generate_content(self, prompt: str, rounds: int = 3):
        client = self._get_client()
        delay = 5
        last_error = None
        for round_no in range(rounds):
            with self._lock:
                candidates = list(self.models)
            for model in candidates:
                try:
                    response = self._call(client, model, prompt)
                    with self._lock:  # prefer whichever model just worked
                        if model in self.models and self.models[0] != model:
                            self.models.remove(model)
                            self.models.insert(0, model)
                    return response
                except Exception as e:
                    msg = f"{type(e).__name__}: {e}"
                    last_error = e
                    if "404" in msg or "NOT_FOUND" in msg:
                        print(f"⚠️ Gemini model {model} is not available; skipping it")
                        with self._lock:
                            if model in self.models and len(self.models) > 1:
                                self.models.remove(model)
                        continue
                    if any(marker in msg for marker in _TRANSIENT_MARKERS):
                        print(f"⏳ Gemini model {model} is busy/slow ({msg[:60]}); trying the next one")
                        continue
                    raise  # bad key, bad request, etc.
            if round_no < rounds - 1:
                print(f"⏳ All Gemini models busy; waiting {delay}s before retrying...")
                time.sleep(delay)
                delay *= 2
        raise last_error

    @property
    def model_name(self):
        return self.models[0] if self.models else None


generation_model = GeminiModel(GEMINI_MODEL, GEMINI_FALLBACK_MODELS)
CLAUSE_WORKERS = int(os.environ.get("CLAUSE_WORKERS", "4"))


def parse_json_object(text: str):
    """Parse a JSON object from a model reply, tolerating ```json fences or extra text around it."""
    cleaned = (text or "").strip().replace('```json', '').replace('```', '').strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find('{'), cleaned.rfind('}')
        if start != -1 and end > start:
            return json.loads(cleaned[start:end + 1])
        raise

# ---- Pinecone knowledge base (optional) ----
# Without it, clauses are judged by Gemini alone (the prompts already handle empty expert context).
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
RENTAL_INDEX_NAME = "karnataka-rental-lows"
EMPLOYMENT_INDEX_NAME = "employment-laws"
LOAN_INDEX_NAME = "loan-laws"
embedding_model = None
rental_pinecone_index = employment_pinecone_index = loan_pinecone_index = None
if PINECONE_API_KEY:
    from pinecone import Pinecone
    from sentence_transformers import SentenceTransformer
    embedding_model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    rental_pinecone_index = pc.Index(RENTAL_INDEX_NAME)
    employment_pinecone_index = pc.Index(EMPLOYMENT_INDEX_NAME)
    loan_pinecone_index = pc.Index(LOAN_INDEX_NAME)

print(f"Gemini model: {GEMINI_MODEL} | API key: {'set' if GOOGLE_API_KEY else 'MISSING'}")
print(f"Pinecone knowledge base: {'enabled' if PINECONE_API_KEY else 'disabled (Gemini-only analysis)'}")
print(f"Tavily web search: {'enabled' if TAVILY_ENABLED else 'disabled'}")
print("Initializations complete. Server is ready.")

key_entity_extraction_prompt = """
You are an expert legal analyst tasked with extracting ONLY the most critical entities from a legal document. Your output will be used for a high-level summary, so it must be concise.

**Instructions:**
1.  **Be Selective:** Focus only on the primary entities that define the agreement.
2.  **Primary Parties:** Identify the main parties (e.g., Lender, Borrower, Landlord).
3.  **Core Financials:** Extract the main financial figures (e.g., Loan Amount, Monthly Rent, Interest Rate).
4.  **Essential Terms & Dates:** Pinpoint crucial dates and terms (e.g., First Payment Date, Repayment Term, Collateral).
5.  **Omit Secondary Info:** Do NOT include witnesses, full street addresses (unless it's collateral), or general city names.
6.  **Formatting:**
    - Do NOT include headers or introductory sentences.
    - Present the result as a simple bulleted list, with each point starting with '*'.
    - **Crucially, use the format: `* Label: Value`**.

**Example for a Loan Agreement:**
* Lender: Rajesh Kumar
* Borrower: Priya Sharma
* Loan Amount: Rs. 10,00,000
* Interest Rate: 12% per annum
* Repayment Term: 24 months
* Collateral: Apartment in Bangalore
* Default Penalty Interest: 3% per month

**Example for a Rental Agreement:**
* Landlord: Aarav Singh
* Tenant: Sneha Gupta
* Monthly Rent: ₹25,000
* Security Deposit: ₹50,000
* Lease Term: 11 Months

Document Text:
\"\"\"{document_text}\"\"\"
"""

def process_contract(document_text: str, summary_prompt: str, analysis_prompt_template: str, pinecone_index, contract_type: str):
    # --- New Stage 0: Key Entity Extraction ---
    print("starting stage 0: key entity extraction...")
    try:
        entity_prompt = key_entity_extraction_prompt.format(document_text=document_text)
        entity_response = generation_model.generate_content(entity_prompt)
        key_entities_result = entity_response.text.strip()
        print("✅ key entities extracted successfully.")
    except Exception as e:
        print(f"❌ error during key entity extraction: {e}")
        key_entities_result = "Could not extract key entities from this document."

    # --- Stage 1: High-level summary ---
    print("starting stage 1: high-level summary...")
    try:
        summary_response = generation_model.generate_content(summary_prompt.format(document_text=document_text))
        summary_result = summary_response.text.strip()
        print("✅ summary generated successfully.")
    except Exception as e:
        print(f"❌ error during summary generation: {e}")
        summary_result = "Could not generate a summary for this document."

    # --- New Stage 1.5: In-Hand Salary Calculation (for employment contracts) ---
    salary_analysis_result = None
    if contract_type == 'employment':
        print("starting stage 1.5: in-hand salary analysis...")
        try:
            salary_prompt = salary_extraction_prompt.format(document_text=document_text)
            salary_response = generation_model.generate_content(salary_prompt)
            salary_components = parse_json_object(salary_response.text)
            salary_analysis_result = calculate_in_hand_salary(salary_components)
            print("✅ in-hand salary analysis complete.")
        except Exception as e:
            print(f"❌ error during salary analysis: {e}")
            salary_analysis_result = {"error": "Could not perform salary analysis."}

    mermaid_code = get_flowchart_mermaid_from_summary(summary_result)

    # --- Stage 2: Clause-by-clause analysis ---
    print("starting stage 2: detailed clause analysis...")
    # Split into clauses at blank lines or at lines starting with "1.", "*", "(a)", "IV." etc.
    # (non-capturing group: a capturing one makes re.split return None items and crash .strip())
    parts = re.split(r'\n\s*\n|\n(?=\s*(?:\d+\.|\*|\([a-zA-Z]\)|\b[IVX]+\.))', document_text)
    chunks = [chunk.strip() for chunk in parts if chunk and len(chunk.strip()) > 50]
    def analyze_chunk(i, chunk):
        print(f"analyzing chunk {i+1}/{len(chunks)}...")
        try:
            # build expert context (only when the Pinecone knowledge base is configured)
            matches = []
            if pinecone_index is not None and embedding_model is not None:
                chunk_embedding = embedding_model.encode(chunk).tolist()
                query_response = pinecone_index.query(
                    vector=chunk_embedding,
                    top_k=4,
                    include_metadata=True
                )
                matches = query_response['matches']

            similar_clauses_context = ""
            for match in matches:
                metadata = match.get('metadata', {})
                similar_clauses_context += (
                    f"- Context: '{metadata.get('clause_text', 'N/A')}'\n"
                    f"  - Risk: {metadata.get('risk_level', 'N/A')}\n"
                    f"  - Explanation: {metadata.get('risk_explanation', 'N/A')}\n"
                )

            # fill the analysis prompt
            analysis_prompt = analysis_prompt_template.format(
                chunk=chunk,
                similar_clauses_context=similar_clauses_context
            )

            analysis_response = generation_model.generate_content(analysis_prompt)
            analysis_json = parse_json_object(analysis_response.text)
            if not isinstance(analysis_json, dict):
                raise ValueError(f"expected a JSON object, got {type(analysis_json).__name__}")
            analysis_json.setdefault("risk_level", "Yellow")
            analysis_json.setdefault("risk_explanation", "")
            analysis_json.setdefault("actionable_advice", "")
            analysis_json.setdefault("clause_category", "General")

            return {
                "original_clause": chunk,
                "analysis": analysis_json
            }
        except Exception as e:
            print(f"❌ error processing chunk {i+1}: {e}")
            return None

    # Analyze clauses in parallel (a few at a time to stay within free-tier rate limits); keep document order.
    with ThreadPoolExecutor(max_workers=CLAUSE_WORKERS) as pool:
        results = list(pool.map(analyze_chunk, range(len(chunks)), chunks))
    risk_analysis_results = [r for r in results if r is not None]

    print("✅ detailed analysis complete.")
    response_data = {
        "key_entities": key_entities_result,
        "summary": summary_result,
        "detailed_analysis": risk_analysis_results,
        "flowchart": mermaid_code,
        "contract_type": contract_type
    }
    if salary_analysis_result:
        response_data["salary_analysis"] = salary_analysis_result
        
    return response_data


# ---- Rental Prompts ----
rental_summary_prompt = """
You are an expert legal analyst. Your task is to explain a rental agreement in simple, plain English for someone in Bengaluru, Karnataka.

**Instructions:**
1.  **Narrative Only:** Write a narrative summary explaining what the agreement means. Describe the key terms like rent, deposit, and lease duration within the story.
2.  **No Lists:** Do NOT create a separate bulleted or itemized list of "Key Details".
3.  **No Intros/Outros:** Do NOT start with conversational phrases like "Of course, here is..." and do NOT add a disclaimer at the end.
4.  **Just the Summary:** Your entire response must be only the narrative summary text.

Here is the document:
{document_text}
"""

rental_analysis_prompt = """
You are a legal risk analyzer for Indian residential rental agreements.

Analyze the "User's Clause" using BOTH:
1) the "Expert Context" (if substantive), and
2) your domain knowledge of typical Indian rental practices.

If the Expert Context is empty or insufficient, DO NOT say "no context" or "N/A".
You MUST still classify risk and provide one-sentence advice based on the clause itself
and general norms for Indian rental agreements (Bengaluru/Karnataka context).

The text is only ONE excerpt of a longer document, so never flag it for missing terms that would be
covered elsewhere. If it is just a title, heading, date/place line, or a description of the parties
(not an obligation or right), classify it as "Neutral" with category "Parties & Preamble".

Return ONLY a VALID JSON object with EXACTLY these keys:
- "risk_level": one of "Red", "Yellow", "Green", or "Neutral"
- "risk_explanation": one concise sentence
- "actionable_advice": one concise sentence tailored to the clause
- "clause_category": concise category (e.g., "Security Deposit", "Termination", "Maintenance", "Rent & Payment", etc.)

**User's Clause to Analyze:**
\"\"\"{chunk}\"\"\"

**Expert Context from Knowledge Base:**
{similar_clauses_context}
"""

# ---- Employment Prompts ----
employment_summary_prompt = """
You are an expert legal analyst. Your task is to explain an employment agreement in simple, plain English for someone in Bengaluru, Karnataka.

**Instructions:**
1.  **Narrative Only:** Write a narrative summary explaining what the agreement means. Describe the key terms like salary, job role, and notice period within the story.
2.  **No Lists:** Do NOT create a separate bulleted or itemized list of "Key Details".
3.  **No Intros/Outros:** Do NOT start with conversational phrases like "Of course, here is..." and do NOT add a disclaimer at the end.
4.  **Just the Summary:** Your entire response must be only the narrative summary text.

Here is the document:
{document_text}
"""

employment_analysis_prompt = """
You are a legal risk analyzer for Indian employment agreements.

Analyze the "User's Clause" using BOTH:
1) the "Expert Context" (if substantive), and
2) your domain knowledge of typical Indian employment practices and labor laws.

If the Expert Context is empty or insufficient, DO NOT say "no context" or "N/A".
You MUST still classify risk and provide one-sentence advice based on the clause itself
and general norms for employment agreements in Bengaluru/Karnataka.

The text is only ONE excerpt of a longer document, so never flag it for missing terms that would be
covered elsewhere. If it is just a title, heading, date/place line, or a description of the parties
(not an obligation or right), classify it as "Neutral" with category "Parties & Preamble".

Return ONLY a VALID JSON object with EXACTLY these keys:
- "risk_level": one of "Red", "Yellow", "Green", or "Neutral"
- "risk_explanation": one concise sentence
- "actionable_advice": one concise sentence tailored to the clause
- "clause_category": concise category (e.g., "Salary & Compensation", "Probation", "Termination", "Non-Compete", "Leave Policy", etc.)

**User's Clause to Analyze:**
\"\"\"{chunk}\"\"\"

**Expert Context from Knowledge Base:**
{similar_clauses_context}
"""

salary_extraction_prompt = """
You are an expert financial analyst reading an Indian employment offer letter. Your goal is to determine the monthly salary components.

**Primary Task:**
First, try to find the explicit monthly values for:
- Basic Salary
- House Rent Allowance (HRA)
- Special Allowance

**Contingency Plan:**
If the document only mentions a total "Cost to Company" (CTC) or "Gross Annual Salary", you must estimate the monthly components based on standard Indian salary structures. A common structure is:
- **Basic Salary:** 40% of the annual CTC, divided by 12.
- **HRA:** 50% of the monthly Basic Salary.
- **Special Allowance:** The remaining amount to make up the total monthly salary.

**Instructions:**
1.  Read the document text provided.
2.  If explicit monthly components are present, use them.
3.  If only an annual total is present, calculate the estimated monthly components.
4.  Return ONLY a valid JSON object with EXACTLY these keys: "basic_salary", "hra", "special_allowance".
5.  The values must be numbers. If a component cannot be found or calculated, use 0.

Document Text:
\"\"\"{document_text}\"\"\"
"""
date_extraction_prompt = """
You are an expert at identifying important dates in legal documents.
Analyze the document below and extract all key dates and their significance.

**Instructions:**
1.  Identify dates like start dates, end dates, notice deadlines, payment due dates, etc.
2.  For each date, provide a clear, concise description of what it represents.
3.  Format the output as a valid JSON array of objects. Each object must have two keys: "date" (in YYYY-MM-DD format) and "description" (a string).
4.  If no significant dates are found, return an empty array `[]`.

**Example Output:**
[
  {
    "date": "2025-09-10",
    "description": "Employment Start Date"
  },
  {
    "date": "2026-03-10",
    "description": "Probation Period Ends"
  }
]

Document Text:
\"\"\"{document_text}\"\"\"
"""

# ---- Loan Prompts ----
loan_summary_prompt = """
You are an expert legal analyst. Your task is to explain a loan agreement in simple, plain English for someone in Bengaluru, Karnataka.

**Instructions:**
1.  **Narrative Only:** Write a narrative summary explaining what the agreement means. Describe who is lending money to whom, the amount, interest, repayment plan, and any important conditions like collateral or penalties.
2.  **No Lists:** Do NOT create a separate bulleted or itemized list of "Key Details".
3.  **No Intros/Outros:** Do NOT start with conversational phrases like "Of course, here is..." and do NOT add a disclaimer at the end.
4.  **Just the Summary:** Your entire response must be only the narrative summary text.

Here is the document:
{document_text}
"""

loan_analysis_prompt = """
You are a legal risk analyzer for Indian loan agreements.

Analyze the "User's Clause" using BOTH:
1) the "Expert Context" (if substantive), and
2) your domain knowledge of Indian lending practices and RBI guidelines.

The text is only ONE excerpt of a longer document, so never flag it for missing terms that would be
covered elsewhere. If it is just a title, heading, date/place line, or a description of the parties
(not an obligation or right), classify it as "Neutral" with category "Parties & Preamble".

Return ONLY a VALID JSON object with EXACTLY these keys:
- "risk_level": one of "Red", "Yellow", "Green", or "Neutral"
- "risk_explanation": one concise sentence
- "actionable_advice": one concise sentence
- "clause_category": concise category (e.g., "Interest Rate", "Repayment", "Default", "Collateral", "Prepayment")

**User's Clause to Analyze:**
\"\"\"{chunk}\"\"\"

**Expert Context from Knowledge Base:**
{similar_clauses_context}
"""

# ---- Wrappers ----
def rental_response(document_text: str):
    return jsonify(process_contract(
        document_text,
        summary_prompt=rental_summary_prompt,
        analysis_prompt_template=rental_analysis_prompt,
        pinecone_index=rental_pinecone_index,
        contract_type='rental'
    ))

def employment_response(document_text: str):
    return jsonify(process_contract(
        document_text,
        summary_prompt=employment_summary_prompt,
        analysis_prompt_template=employment_analysis_prompt,
        pinecone_index=employment_pinecone_index,
        contract_type='employment'
    ))

def loan_response(document_text: str):
    return jsonify(process_contract(
        document_text,
        summary_prompt=loan_summary_prompt,
        analysis_prompt_template=loan_analysis_prompt,
        pinecone_index=loan_pinecone_index,
        contract_type='loan'
    ))


# ---- Endpoint ----
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "gemini_model": GEMINI_MODEL,
        "gemini_key_set": bool(GOOGLE_API_KEY),
        "pinecone_enabled": embedding_model is not None,
        "tavily_enabled": TAVILY_ENABLED,
    })


def _missing_key_response():
    return jsonify({"error": "GOOGLE_API_KEY is not set on the server. Add it to backend/.env and restart."}), 503


@app.route('/analyze', methods=['POST'])
def analyze_document():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({"error": "Request body must contain 'text'"}), 400
    if not GOOGLE_API_KEY:
        return _missing_key_response()

    document_text = data['text']
    if not document_text.strip():
        return jsonify({"error": "No text could be extracted from the document (is it a scanned image?)."}), 400
    try:
        contract_type = detect_contract_type(document_text)
    except Exception as e:
        return jsonify({"error": f"Gemini API call failed: {str(e)[:300]}"}), 502

    print(f"Detected contract type: {contract_type}")

    if contract_type == 'rental':
        return rental_response(document_text)
    elif contract_type == 'employment':
        return employment_response(document_text)
    elif contract_type == 'loan':
        return loan_response(document_text)
    else:
        return jsonify({"error": "Unsupported contract type. Only rental, employment and loan agreements are supported."}), 400


@app.route('/chatbot', methods=['POST'])
def chatbot():
    """
    Chatbot endpoint to answer user questions about the contract.
    Expects JSON input with:
      - 'summary': summary of the contract
      - 'detailedAnalysis': list of clause analyses
      - 'question': user's question
    """
    data = request.get_json(silent=True)
    if not data or 'summary' not in data or 'detailedAnalysis' not in data or not data.get('question'):
        return jsonify({"error": "Request body must contain 'summary', 'detailedAnalysis' and 'question'"}), 400
    if not GOOGLE_API_KEY:
        return _missing_key_response()

    summary = parse_summary(data['summary'] or "")
    detailed_analysis = data['detailedAnalysis']
    question = data['question']

    # Prepare context for the LLM
    context = f"""
    You are a legal assistant specializing in Indian rental, employment and loan agreements.

    Your job:
    1. First, check the provided summary and clause analyses for explicit rules.
    2. If the agreement is silent on the issue, point this out clearly.
    3. Then, explain the *typical legal or common practice in India* that would apply in such a case.
    4. Suggest what the user should clarify or negotiate with the other party.

    Keep your answer simple, practical, and written for a non-lawyer.

    **Contract Summary:**
    {summary}

    **Detailed Analysis of Clauses:**
    {detailed_analysis}

    **User Question:**
    {question}

    Keep the response small and one liner points.
    """

    try:
        response = generation_model.generate_content(context)
        answer = response.text.strip()
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"❌ error during chatbot response: {e}")
        return jsonify({"error": "Could not generate a response."}), 500


@app.route('/loan_comparison', methods=['POST'])
def loan_comparison():
    data = request.get_json(silent=True)
    if not data or 'summary' not in data:
        return jsonify({"error": "Request body must contain 'summary'"}), 400
    if not GOOGLE_API_KEY:
        return _missing_key_response()

    summary = parse_summary(data['summary'])
    agreement_rate = extract_interest_rate(summary)
    rate_text = f"{agreement_rate}%" if agreement_rate is not None else "an unspecified rate"

    market_data = None
    if TAVILY_ENABLED:
        try:
            market_data = tavily_search_tool("current personal loan interest rates India banks")
        except Exception as e:
            print(f"❌ Tavily search failed: {e}")

    if market_data:
        prompt = (f"A loan agreement charges {rate_text} interest. Here are current market loan rates "
                  f"from a web search: {market_data}. Compare and suggest the best options, briefly.")
    else:
        prompt = (f"A loan agreement in India charges {rate_text} interest. Based on your general knowledge of "
                  f"typical Indian bank personal-loan rates, say whether this is high or reasonable and what "
                  f"alternatives the borrower could look at. Note that you have no live rate data. Be brief.")

    try:
        response = generation_model.generate_content(prompt)
        return jsonify({"comparison": response.text.strip(), "live_data": bool(market_data)})
    except Exception as e:
        print(f"❌ error during loan comparison: {e}")
        return jsonify({"error": "Could not generate a comparison."}), 500


logger = logging.getLogger(__name__)


def get_flowchart_mermaid_from_summary(summary_text: str) -> str:
    """
    Generates Mermaid flowchart code from a summary of a legal document using the generative model.
    Extracts and returns clean Mermaid code without markdown fences.
    """
    prompt = f"""
    You are a helpful assistant that converts a summary of a legal document into a Mermaid.js flowchart.
    Based on the following summary, create a Mermaid.js flowchart (using "graph TD") that visualizes the key stages and decision points of the agreement.

    The flowchart should be simple and easy to understand for a layperson.
    Keep node labels short and avoid parentheses, quotes and special characters inside labels.
    Your response should only contain the Mermaid code, inside a ```mermaid code block.

    Summary:
    {summary_text}
    """

    try:
        logging.info("🤖 Generating flowchart from summary...")
        response = generation_model.generate_content(prompt)
        raw_output = response.text or ""

        # Extract Mermaid code from a ```mermaid ... ``` (or plain ``` ... ```) fenced block
        match = re.search(r"```(?:mermaid)?\s*\n(.*?)```", raw_output, re.DOTALL)

        if match:
            mermaid_code = match.group(1).strip()
        else:
            logging.warning("Mermaid code block not found in model output; returning trimmed text.")
            mermaid_code = raw_output.replace("```mermaid", "").replace("```", "").strip()

        logging.info("✅ Flowchart generated successfully.")
        return mermaid_code

    except Exception as error:
        logging.error(f"❌ Error during flowchart generation: {error}", exc_info=True)
        # Return minimal fallback flowchart on failure
        return "graph TD;\n    A[Error generating flowchart];"


def parse_summary(summary: str) -> str:
    """
    Parse the markdown-style summary into a clean, structured text block
    for the LLM context.
    """
    lines = summary.split("\n")
    parsed_lines = []

    for line in lines:
        # Extract bold headings like **Key:** Value
        match = re.match(r"\*\*(.*?)\*\*[:\-]*\s*(.*)", line.strip())
        if match:
            key, value = match.groups()
            parsed_lines.append(f"{key.strip()}: {value.strip()}")
        else:
            # Keep non-empty plain lines
            if line.strip():
                parsed_lines.append(line.strip())

    return "\n".join(parsed_lines)

def detect_contract_type(document_text: str) -> str:
    """
    Identify contract type from text. Returns one of 'rental', 'employment', 'loan' or 'unknown'.
    """
    try:
        classification_prompt = f"""
        You are a contract classifier.
        Based ONLY on the text provided, decide if this contract is:
        - Rental Agreement
        - Employment Agreement
        - Loan Agreement

        Return only one word: "rental", "employment", "loan".

        Document:
        {document_text[:3000]}  # truncate to avoid token overload
        """
        response = generation_model.generate_content(classification_prompt)
        label = response.text.strip().lower()

        if "rental" in label:
            return "rental"
        elif "employment" in label:
            return "employment"
        elif "loan" in label:
            return "loan"
        else:
            return "unknown"
    except Exception as e:
        # Don't disguise API failures (bad key, retired model, quota) as "unsupported contract"
        print(f"❌ error in contract classification: {e}")
        raise

def calculate_in_hand_salary(salary_components: dict) -> dict:
    """Calculates in-hand salary based on extracted components for Karnataka."""
    try:
        basic = salary_components.get("basic_salary", 0)
        hra = salary_components.get("hra", 0)
        special_allowance = salary_components.get("special_allowance", 0)

        if basic == 0:
            return {"error": "Basic Salary could not be determined, cannot calculate in-hand salary."}

        gross_monthly = basic + hra + special_allowance
        annual_gross = gross_monthly * 12

        employee_pf = 0.12 * basic

        professional_tax = 200 if gross_monthly > 15000 else 0

        taxable_income = annual_gross - 50000
        annual_tax = 0
        if taxable_income > 1500000:
            annual_tax = 150000 + (taxable_income - 1500000) * 0.30
        elif taxable_income > 1200000:
            annual_tax = 90000 + (taxable_income - 1200000) * 0.20
        elif taxable_income > 900000:
            annual_tax = 45000 + (taxable_income - 900000) * 0.15
        elif taxable_income > 600000:
            annual_tax = 15000 + (taxable_income - 600000) * 0.10
        elif taxable_income > 300000:
            annual_tax = (taxable_income - 300000) * 0.05
        
        monthly_tds = annual_tax / 12 if annual_tax > 0 else 0

        # Final Calculation
        total_deductions = employee_pf + professional_tax + monthly_tds
        in_hand_salary = gross_monthly - total_deductions

        return {
            "estimated_monthly_in_hand": round(in_hand_salary),
            "gross_monthly_salary": round(gross_monthly),
            "deductions": {
                "employee_pf": round(employee_pf),
                "professional_tax": round(professional_tax),
                "estimated_tds": round(monthly_tds),
                "total_deductions": round(total_deductions)
            }
        }
    except Exception as e:
        return {"error": f"An error occurred during salary calculation: {e}"}

if __name__ == "__main__":
    import os
    app.run(
        debug=True,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080))
    )