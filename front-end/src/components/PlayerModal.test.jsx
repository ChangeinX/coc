import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock API helper
vi.mock('../lib/api.js', () => ({
  fetchJSONCached: vi.fn(),
  API_URL: '',
}));

import PlayerModal from './PlayerModal.jsx';
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

describe('PlayerModal', () => {
  it('displays labels instead of donation pills', async () => {
    fetchJSONCached.mockResolvedValue(samplePlayer);
    render(<PlayerModal tag="AAA" onClose={() => {}} />);
    await waitFor(() => expect(fetchJSONCached).toHaveBeenCalled());
    expect(screen.getByAltText('Veteran')).toBeInTheDocument();
    expect(screen.queryByText(/Don\u00a0/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rec\u00a0/)).not.toBeInTheDocument();
  });

  it('keeps badges on a single row with horizontal scrolling', async () => {
    fetchJSONCached.mockResolvedValue(samplePlayer);
    render(<PlayerModal tag="AAA" onClose={() => {}} />);
    await waitFor(() => expect(fetchJSONCached).toHaveBeenCalled());
    const row = screen.getByText('TH12').parentElement.parentElement;
    expect(row).toHaveClass('flex-nowrap');
    expect(row).toHaveClass('overflow-x-auto');
  });
});
