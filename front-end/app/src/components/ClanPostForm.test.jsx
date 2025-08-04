import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(),
  API_URL: '',
}));

import ClanPostForm from './ClanPostForm.jsx';
import { fetchJSON } from '../lib/api.js';

test('submits clan post', async () => {
  fetchJSON.mockImplementation((path) => {
    if (path === '/user/me') return Promise.resolve({ player_tag: 'PLAYER' });
    if (path.startsWith('/player/')) return Promise.resolve({ clanTag: 'CLAN' });
    if (path.startsWith('/clan/')) return Promise.resolve({ tag: 'CLAN', name: 'Clan', labels: [] });
    if (path === '/recruiting/recruit') return Promise.resolve({});
    return Promise.resolve({});
  });

  const onPosted = vi.fn();
  const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
  render(<ClanPostForm onPosted={onPosted} />);

  await screen.findByPlaceholderText('Describe your clan');
  fireEvent.change(screen.getByPlaceholderText('Describe your clan'), {
    target: { name: 'callToAction', value: 'Best clan ever' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post' }));

  await waitFor(() => expect(fetchJSON).toHaveBeenCalledWith('/recruiting/recruit', expect.any(Object)));
  const postCall = fetchJSON.mock.calls.find(([p]) => p === '/recruiting/recruit');
  const [, opts] = postCall;
  expect(JSON.parse(opts.body)).toEqual({ clanTag: 'CLAN', callToAction: 'Best clan ever' });
  await waitFor(() => expect(onPosted).toHaveBeenCalled());
  expect(dispatchSpy).toHaveBeenCalled();
  const [evt] = dispatchSpy.mock.calls[0];
  expect(evt.type).toBe('toast');
  expect(evt.detail).toBe('Recruiting post created!');
});

