/**
 * VibeGuard – AI proxy client
 *
 * The frontend sends requests to the backend proxy routes so API keys
 * remain on the server or are only used in-session without localStorage.
 */

const API_BASE_URL =
  window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : '';

async function checkAIStatus() {
  const response = await fetch(`${API_BASE_URL}/api/status`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || response.statusText);
  }
  return response.json();
}

async function runAIAudit(code, language, apiKey) {
  const body = { code, language };
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    body.apiKey = apiKey.trim();
  }

  const response = await fetch(`${API_BASE_URL}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || response.statusText);
  }

  const data = await response.json();
  return Array.isArray(data.findings) ? data.findings : [];
}

async function sendAIChat(apiKey, text) {
  //const body = { text };
  const body = { text, apiKey };
  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    body.apiKey = apiKey.trim();
  }

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || response.statusText);
  }

  const data = await response.json();
  return data.reply || '';
}
