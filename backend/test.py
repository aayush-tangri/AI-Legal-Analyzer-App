import os
import re
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import vertexai
from sentence_transformers import SentenceTransformer
import re
import json5

from pinecone import Pinecone
from flask_cors import CORS

from vertexai.generative_models import GenerativeModel
from langchain_google_genai import ChatGoogleGenerativeAI
from helper import extract_interest_rate, tavily_search_tool

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
REGION = os.environ.get("GCP_REGION")
vertexai.init(project=PROJECT_ID, location=REGION)

generation_model = GenerativeModel("gemini-2.5-pro")
embedding_model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")  
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash",api_key=os.environ.get("GOOGLE_API_KEY"))
llm_tools = llm.bind_tools([tavily_search_tool])

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
RENTAL_INDEX_NAME = "karnataka-rental-lows"
EMPLOYMENT_INDEX_NAME = "employment-laws"
LOAN_INDEX_NAME = "loan-laws"
pc = Pinecone(api_key=PINECONE_API_KEY)
rental_pinecone_index = pc.Index(RENTAL_INDEX_NAME)
employment_pinecone_index = pc.Index(EMPLOYMENT_INDEX_NAME)
loan_pinecone_index = pc.Index(LOAN_INDEX_NAME)


print("Initializations complete. Server is ready.")

def process_contract(document_text: str, summary_prompt: str, analysis_prompt_template: str, pinecone_index):
    # --- Stage 1: High-level summary ---
    print("starting stage 1: high-level summary...")
    try:
        summary_response = llm.invoke(summary_prompt.format(document_text=document_text))
        summary_result = summary_response.content.strip()
        print("✅ summary generated successfully.")
    except Exception as e:
        print(f"❌ error during summary generation: {e}")
        summary_result = "Could not generate a summary for this document."

    mermaid_code = get_flowchart_mermaid_from_summary(summary_result)

    # --- Stage 2: Clause-by-clause analysis ---
    print("🚀 starting stage 2: detailed clause analysis...")
    chunks = [chunk for chunk in re.split(r'\n\s*\n', document_text) if len(chunk.strip()) > 100]
    risk_analysis_results = []

    for i, chunk in enumerate(chunks):
        print(f"analyzing chunk {i+1}/{len(chunks)}...")
        try:
            chunk_embedding = embedding_model.encode(chunk).tolist()
            query_response = pinecone_index.query(
                vector=chunk_embedding,
                top_k=4,
                include_metadata=True
            )

            # build expert context
            similar_clauses_context = ""
            for match in query_response['matches']:
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

            analysis_response = llm.invoke(analysis_prompt)
            raw_output = analysis_response.content

            if isinstance(raw_output, list):
                raw_output = " ".join(
                    [c.get("text", "") if isinstance(c, dict) else str(c) for c in raw_output]
                )

            clean_json_string = str(raw_output).strip()
            clean_json_string = clean_json_string.replace("```json", "").replace("```", "")

            try:
                analysis_json = json.loads(clean_json_string)
            except json.JSONDecodeError:
                analysis_json = json5.loads(clean_json_string)

            risk_analysis_results.append({
                "original_clause": chunk,
                "analysis": analysis_json
            })
        except Exception as e:
            print(f"❌ error processing chunk {i+1}: {e}")
            continue

    print("✅ detailed analysis complete.")
    return {
        "summary": summary_result,
        "detailed_analysis": risk_analysis_results
    }


# ---- Rental Prompts ----
rental_summary_prompt = """
You are a helpful assistant who explains legal documents in simple, plain English for someone in Bengaluru, Karnataka as of August 2025.
Read the following rental agreement and provide a simple summary.

Extract these key details:
- Landlord's Name
- Tenant's Name
- Property Address
- Monthly Rent Amount
- Security Deposit Amount
- Lease Duration (e.g., 11 months, 3 years)
- Lock-in Period

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
You are a helpful assistant who explains legal documents in simple, plain English for someone in Bengaluru, Karnataka as of August 2025.
Read the following employment agreement and provide a simple summary.

Extract these key details:
- Employer's Name
- Employee's Name
- Job Title / Designation
- Start Date of Employment
- Work Location
- Salary / CTC Details (if mentioned)
- Probation Period (if any)
- Notice Period (for termination/resignation)
- Contract Duration (e.g., permanent, 1-year contract)

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
# ---- Loan Prompts ----
loan_summary_prompt = """
You are a helpful assistant who explains legal documents in simple, plain English for someone in Bengaluru, Karnataka as of August 2025.
Read the following loan agreement and provide a simple summary.

Extract these key details:
- Lender's Name
- Borrower's Name
- Loan Amount
- Interest Rate
- Repayment Schedule
- Loan Tenure
- Collateral (if any)
- Default & Penalty Terms

Here is the document:
{document_text}
"""

loan_analysis_prompt = """
You are a legal risk analyzer for Indian loan agreements.

Analyze the "User's Clause" using BOTH:
1) the "Expert Context" (if substantive), and
2) your domain knowledge of Indian lending practices and RBI guidelines.

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
        pinecone_index=rental_pinecone_index
    ))

def employment_response(document_text: str):
    return jsonify(process_contract(
        document_text,
        summary_prompt=employment_summary_prompt,
        analysis_prompt_template=employment_analysis_prompt,
        pinecone_index=employment_pinecone_index
    ))

def loan_response(document_text: str):
    return jsonify(process_contract(
        document_text,
        summary_prompt=loan_summary_prompt,
        analysis_prompt_template=loan_analysis_prompt,
        pinecone_index=loan_pinecone_index
    ))

# ---- Endpoint ----
@app.route('/analyze', methods=['POST'])
def analyze_document():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Request body must contain 'text'"}), 400
    
    document_text = data['text']
    contract_type = detect_contract_type(document_text)

    print(f"Detected contract type: {contract_type}")

    if contract_type == 'rental':
        return rental_response(document_text)
    elif contract_type == 'employment':
        return employment_response(document_text)
    elif contract_type == 'loan':
        return loan_response(document_text)
    else:
        return jsonify({"error": "Unsupported contract type. Only rental and employment agreements are supported."}), 400


@app.route('/chatbot', methods=['POST'])
def chatbot():
    """
    Chatbot endpoint to answer user questions about the contract.
    Expects JSON input with:
      - 'summary': summary of the contract
      - 'detailed_analysis': list of clause analyses
      - 'question': user's question
    """
    data = request.get_json()
    if not data or 'summary' not in data or 'detailedAnalysis' not in data :
        return jsonify({"error": "Request body must contain 'summary', 'detailed_analysis'"}), 400

    summary = parse_summary(data['summary'])
    detailed_analysis = data['detailedAnalysis']
    question = data['question']

    # Prepare context for the LLM
    context = f"""
    You are a legal assistant specializing in Indian rental, employment and loan agreements. 

    Your job:
    1. First, check the provided summary and clause analyses for explicit rules. 
    2. If the agreement is silent on the issue, point this out clearly.
    3. Then, explain the *typical legal or common practice in India* that would apply in such a case. 
    4. Suggest what the tenant should clarify or negotiate with the landlord.

    Keep your answer simple, practical, and written for a non-lawyer.

    **Contract Summary:**
    {summary}

    **Detailed Analysis of Clauses:**
    {detailed_analysis}

    **User Question:**
    {question}

    Keep the response small and one liner points"
    """

    try:
        response = llm.invoke(context)
        answer = response.content.strip()
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"❌ error during chatbot response: {e}")
        return jsonify({"error": "Could not generate a response."}), 500

@app.route('/loan_comparison', methods=['POST'])
def loan_comparison():
    data = request.get_json()
    if 'summary' not in data:
        return jsonify({"error": "Request body must contain 'summary'"}), 400

    summary = parse_summary(data['summary'])
    agreement_rate = extract_interest_rate(summary)

    query = f"current personal loan interest rates India September 2025"

    # Step 1: Ask Gemini with tool binding
    response = llm_tools.invoke(
        f"The loan agreement has {agreement_rate}% interest. "
        f"Search for banks offering lower rates. Query: {query}"
    )

    # Step 2: Check if Gemini tried to call a tool
    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call["name"] == "tavily_search_tool":
            tool_args = tool_call["args"]
            tool_result = tavily_search_tool(**tool_args)   # actually call your function

            # Step 3: Send tool result back to Gemini for reasoning
            followup = llm_tools.invoke(
                f"The agreement interest rate is {agreement_rate}%. "
                f"Here are the current market loan rates: {tool_result}. "
                f"Compare and suggest the best option."
            )
            return jsonify({"comparison": followup.content})

    return jsonify({"answer": response.content})



# put flowchart api here
def get_flowchart_mermaid_from_summary(summary_text: str) -> str:
    """Generates Mermaid flowchart code from a summary text using the generative model."""
    prompt = f"""
    You are a helpful assistant that converts a summary of a legal document into a Mermaid.js flowchart.
    Based on the following summary, create a Mermaid.js flowchart that visualizes the key stages and decision points of the rental agreement process.

    The flowchart should be simple and easy to understand for a layperson.
    Your response should only contain the Mermaid code, starting with ```mermaid and ending with ```.

    Summary:
    {summary_text}
    """
    try:
        print("🤖 generating flowchart...")
        response = generation_model.generate_content(prompt)
        # Extract the mermaid code from the response
        mermaid_code = response.text.strip().replace('```mermaid', '').replace('```', '')
        print("✅ flowchart generated successfully.")
        return mermaid_code
    except Exception as e:
        print(f"❌ error during flowchart generation: {e}")
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
    Identify contract type from text. Returns one of 'rental', 'employment', or 'unknown'.
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
        response = llm.invoke(classification_prompt)
        label = response.content.strip().lower()

        if "rental" in label:
            return "rental"
        elif "employment" in label:
            return "employment"
        elif "loan" in label:
            return "loan"
        else:
            return "unknown"
    except Exception as e:
        print(f"❌ error in contract classification: {e}")
        return "unknown"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)),debug=True)