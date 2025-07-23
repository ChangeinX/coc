import { describe, it, expect, vi, afterEach } from 'vitest';
import { graphqlRequest } from './gql.js';
import { API_URL } from './api.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('graphqlRequest', () => {
  it('sends auth header when token stored', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })
    );
    global.fetch = fetchMock;
    await graphqlRequest('query { test }');
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/v1/graphql`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc123' }),
      })
    );
  });
});
