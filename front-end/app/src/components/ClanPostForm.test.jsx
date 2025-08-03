import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(() => Promise.resolve({})),
  API_URL: '',
}));

import ClanPostForm from './ClanPostForm.jsx';
import { fetchJSON } from '../lib/api.js';

test('submits clan post', async () => {
  const onPosted = vi.fn();
  render(<ClanPostForm onPosted={onPosted} />);
  fireEvent.change(screen.getByPlaceholderText('Clan name'), {
    target: { value: 'Test Clan' },
  });
  fireEvent.change(screen.getByPlaceholderText('Describe your clan'), {
    target: { value: 'Best clan ever' },
  });
  fireEvent.change(screen.getByPlaceholderText('Tags (comma separated)'), {
    target: { value: 'war, chill' },
  });
  fireEvent.change(screen.getByPlaceholderText('Open slots'), {
    target: { value: '3' },
  });
  fireEvent.change(screen.getByPlaceholderText('Total slots'), {
    target: { value: '30' },
  });
  fireEvent.change(screen.getByPlaceholderText('League'), {
    target: { value: 'Gold' },
  });
  fireEvent.change(screen.getByPlaceholderText('Language'), {
    target: { value: 'English' },
  });
  fireEvent.change(screen.getByPlaceholderText('War frequency'), {
    target: { value: 'Always' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post' }));
  await waitFor(() => expect(fetchJSON).toHaveBeenCalled());
  const [, opts] = fetchJSON.mock.calls[0];
  expect(JSON.parse(opts.body)).toEqual({
    name: 'Test Clan',
    description: 'Best clan ever',
    tags: ['war', 'chill'],
    openSlots: 3,
    totalSlots: 30,
    league: 'Gold',
    language: 'English',
    war: 'Always',
  });
  await waitFor(() => expect(onPosted).toHaveBeenCalled());
});

