import { API_URL } from './api.js';

export async function graphqlRequest(query, variables = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const url = `${API_URL}/api/v1/chat/graphql`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('unauthorized'));
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}
