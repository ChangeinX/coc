import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import useRecruitFeed from './useRecruitFeed.js';

function Wrapper({ filters }) {
  useRecruitFeed(filters);
  return null;
}

describe('useRecruitFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [], nextCursor: null }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    global.caches = {
      open: vi.fn(() =>
        Promise.resolve({
          match: vi.fn(() => Promise.resolve(undefined)),
          put: vi.fn(() => Promise.resolve()),
        })
      ),
    };
  });

  it('sends filters as query params', async () => {
    const filters = {
      league: 'Gold',
      language: 'EN',
      war: 'always',
      q: 'abc',
      sort: 'new',
    };
    render(<Wrapper filters={filters} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('league=Gold');
    expect(url).toContain('language=EN');
    expect(url).toContain('war=always');
    expect(url).toContain('q=abc');
    expect(url).toContain('sort=new');
    const opts = fetch.mock.calls[0][1];
    expect(opts).toMatchObject({ credentials: 'include' });
  });
});
