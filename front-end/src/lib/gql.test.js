import { describe, it, expect, vi, afterEach } from 'vitest';
import { graphqlRequest } from './gql.js';
import { API_URL } from './api.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('graphqlRequest', () => {
  it('sends request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })
    );
    global.fetch = fetchMock;
    await graphqlRequest('query { test }');
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/v1/chat/graphql`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});
