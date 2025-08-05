import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(),
  API_URL: '',
}));

import { fetchJSON } from '../lib/api.js';
import Scout from './Scout.jsx';

describe('Scout page', () => {
  beforeEach(() => {
    fetchJSON.mockImplementation((path) => {
      if (path === '/user/me') return Promise.resolve({ player_tag: 'PLAYER' });
      if (path.startsWith('/player/')) return Promise.resolve({ clanTag: 'CLAN' });
      if (path.startsWith('/clan/')) return Promise.resolve({ tag: 'CLAN', name: 'Clan', labels: [] });
      if (path.startsWith('/recruiting/player-recruit'))
        return Promise.resolve({ items: [], next: null });
      if (path.startsWith('/recruiting')) return Promise.resolve({ items: [], next: null });
      return Promise.resolve({});
    });
  });

  it('renders tabs', () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    expect(screen.getByText('Find a Clan')).toBeInTheDocument();
    expect(screen.getByText('Need a Clan')).toBeInTheDocument();
  });

  it('shows find a clan form by default', async () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    await screen.findByPlaceholderText('Describe your clan');
  });

  it('shows need a clan form when tab selected', async () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Need a Clan'));
    await screen.findByPlaceholderText('Describe yourself');
  });

  it('posts a player recruit and clears form', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Need a Clan'));
    const textarea = await screen.findByPlaceholderText('Describe yourself');
    fireEvent.change(textarea, { target: { value: 'Looking for clan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await screen.findByRole('button', { name: 'Post' });
    expect(fetchJSON).toHaveBeenCalledWith(
      '/recruiting/player-recruit',
      expect.objectContaining({ method: 'POST' })
    );
    expect(textarea.value).toBe('');
    expect(dispatchSpy).toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });
});
