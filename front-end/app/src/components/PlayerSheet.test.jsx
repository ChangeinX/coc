import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSONCached: vi.fn(),
  API_URL: '',
}));

import PlayerSheet from './PlayerSheet.jsx';
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

describe('PlayerSheet', () => {
  it('renders player summary inside sheet', async () => {
    fetchJSONCached.mockResolvedValue(samplePlayer);
    render(<PlayerSheet tag="AAA" onClose={() => {}} />);
    await waitFor(() => expect(fetchJSONCached).toHaveBeenCalled());
    expect(screen.getByText('Member Health')).toBeInTheDocument();
  });
});
