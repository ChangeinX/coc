import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSONCached: vi.fn(),
  API_URL: '',
}));

import PlayerSummary from './PlayerSummary.jsx';
import { fetchJSONCached } from '../lib/api.js';

const samplePlayer = {
  name: 'Alice',
  tag: '#AAA',
  townHallLevel: 12,
  trophies: 3200,
  labels: [
    { id: 1, name: 'Veteran', iconUrls: { small: 'http://example.com/vet.png' } },
  ],
  donations: 0,
  donationsReceived: 0,
  risk_score: 10,
  last_seen: '2024-01-01T00:00:00Z',
  loyalty: 5,
};

describe('PlayerSummary', () => {
  it('omits header when disabled and wraps badges', async () => {
    fetchJSONCached.mockResolvedValue(samplePlayer);
    render(<PlayerSummary tag="AAA" showHeader={false} scrollBadges={false} />);
    await waitFor(() => expect(fetchJSONCached).toHaveBeenCalled());
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    const row = screen.getByText('TH12').parentElement.parentElement;
    expect(row).toHaveClass('flex-wrap');
    expect(row).not.toHaveClass('overflow-x-auto');
  });
});
