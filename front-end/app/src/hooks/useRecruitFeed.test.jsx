import { render, waitFor, screen } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import useRecruitFeed from './useRecruitFeed.js';

function Wrapper({ filters }) {
  const { items } = useRecruitFeed(filters);
  return <div data-testid="items">{JSON.stringify(items)}</div>;
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
    const filters = { q: 'abc' };
    render(<Wrapper filters={filters} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('q=abc');
    const opts = fetch.mock.calls[0][1];
    expect(opts).toMatchObject({ credentials: 'include' });
  });

  it('normalizes clan fields', async () => {
    const data = {
      items: [
        {
          clan: {
            tag: '#1',
            name: 'Clan',
            warLeague: { name: 'Gold' },
            clanLevel: 3,
            requiredTrophies: 1000,
            requiredTownhallLevel: 9,
            members: 20,
            labels: [],
            language: 'EN',
          },
        },
      ],
      nextCursor: null,
    };
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    render(<Wrapper filters={{}} />);
    await waitFor(() => {
      const items = JSON.parse(screen.getByTestId('items').textContent);
      expect(items[0].data.memberCount).toBe(20);
      expect(items[0].data.warLeague.name).toBe('Gold');
      expect(items[0].data.requiredTrophies).toBe(1000);
    });
  });
});
