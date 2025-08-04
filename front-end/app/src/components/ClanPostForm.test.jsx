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
  const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
  render(<ClanPostForm onPosted={onPosted} />);
  fireEvent.change(screen.getByPlaceholderText('Describe your clan'), {
    target: { name: 'callToAction', value: 'Best clan ever' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Post' }));
  await waitFor(() => expect(fetchJSON).toHaveBeenCalled());
  const [, opts] = fetchJSON.mock.calls[0];
  expect(JSON.parse(opts.body)).toEqual({ callToAction: 'Best clan ever' });
  await waitFor(() => expect(onPosted).toHaveBeenCalled());
  expect(dispatchSpy).toHaveBeenCalled();
  const [evt] = dispatchSpy.mock.calls[0];
  expect(evt.type).toBe('toast');
  expect(evt.detail).toBe('Recruiting post created!');
});

