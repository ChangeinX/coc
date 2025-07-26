import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJSONCached, fetchJSONWithError, API_URL } from './api.js';

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('coc-cache');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('fetchJSONCached', () => {
  it('returns cached data on 304 using ETag', async () => {
    vi.useFakeTimers();
    const firstResponse = new Response(JSON.stringify({ foo: 'bar' }), {
      status: 200,
      headers: { ETag: 'v1' },
    });
    const secondResponse = new Response(null, {
      status: 304,
      headers: { ETag: 'v1' },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);
    global.fetch = fetchMock;

    vi.setSystemTime(0);
    const data1 = await fetchJSONCached('/test');
    expect(data1).toEqual({ foo: 'bar' });

    vi.setSystemTime(61000);
    const data2 = await fetchJSONCached('/test');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_URL}/api/v1/test`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'If-None-Match': 'v1' }),
      }),
    );
    expect(data2).toEqual({ foo: 'bar' });
  });
});

describe('fetchJSONWithError', () => {
  it('throws with message from body', async () => {
    const resp = new Response(JSON.stringify({ error: 'bad' }), { status: 400 });
    global.fetch = vi.fn(() => Promise.resolve(resp));
    await expect(fetchJSONWithError('/bad')).rejects.toThrow('bad');
  });
});
