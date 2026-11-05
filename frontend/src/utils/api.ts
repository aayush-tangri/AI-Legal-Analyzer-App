const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Prefer the backend's own error message (e.g. "GOOGLE_API_KEY is not set") over a generic one.
async function errorFrom(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return new Error(body.error);
  } catch {}
  return new Error(fallback);
}

export async function analyzeDocument(text: string) {
  const res = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw await errorFrom(res, 'Failed to analyze document');
  return res.json();
}

export async function askChatbot(inputData: any, question: string) {
  const res = await fetch(`${API_BASE_URL}/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...inputData, question }),
  });
  if (!res.ok) throw await errorFrom(res, 'Failed to get chatbot response');
  return res.json();
}

export async function loanComparison(summary: string) {
  const res = await fetch(`${API_BASE_URL}/loan_comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary }),
  });
  if (!res.ok) throw await errorFrom(res, 'Failed to get loan comparison');
  return res.json();
}