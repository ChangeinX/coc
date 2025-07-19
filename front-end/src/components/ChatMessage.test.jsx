import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSONCached: vi.fn(),
}));
vi.mock('../lib/assets.js', () => ({
  proxyImageUrl: (url) => url,
}));

import ChatMessage from './ChatMessage.jsx';
import { fetchJSONCached } from '../lib/api.js';

const sample = { name: 'Alice', leagueIcon: 'http://ex/icon.png' };

describe('ChatMessage', () => {
  it('displays player name and icon', async () => {
    fetchJSONCached.mockResolvedValue(sample);
    render(<ChatMessage message={{ userId: 'AAA', content: 'hi' }} />);
    await waitFor(() => expect(fetchJSONCached).toHaveBeenCalled());
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByAltText('league')).toHaveAttribute('src', sample.leagueIcon);
  });
});
