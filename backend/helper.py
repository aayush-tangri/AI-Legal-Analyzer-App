import re
import os
from dotenv import load_dotenv
load_dotenv()

# Tavily web search is optional: only used by /loan_comparison for live bank rates.
TAVILY_KEY = os.environ.get("TAVILY_API_KEY")
TAVILY_ENABLED = bool(TAVILY_KEY)
_tavily_client = None


def extract_interest_rate(summary: str):
    """
    Extracts the interest rate from the summary text.
    Returns a float (e.g., 12.0 for 12%) or None if not found.
    """
    match = re.search(r'(\d+(?:\.\d+)?)\s*%.*interest', summary, re.IGNORECASE)
    print('Extracted agreement rate:', match)
    if match:
        return float(match.group(1))
    return None


def tavily_search_tool(query: str) -> list:
    """
    Search Tavily for current loan interest rates.
    Returns a list of dicts with title, snippet, and URL.
    """
    global _tavily_client
    if not TAVILY_ENABLED:
        raise RuntimeError("TAVILY_API_KEY is not set")
    if _tavily_client is None:
        from tavily import TavilyClient
        _tavily_client = TavilyClient(api_key=TAVILY_KEY)

    search_results = _tavily_client.search(query, max_results=5)
    parsed = []
    for r in search_results.get("results", []):
        parsed.append({
            "title": r.get("title", ""),
            "snippet": r.get("content", ""),
            "url": r.get("url", "")
        })
    print("✅ Tavily Search Done")
    return parsed
