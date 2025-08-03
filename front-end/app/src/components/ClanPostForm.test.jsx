import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn().mockResolvedValue({}),
  API_URL: '',
}));

import ClanPostForm from './ClanPostForm.jsx';
import { fetchJSON } from '../lib/api.js';

describe('ClanPostForm', () => {
  it('posts form data to /recruit', async () => {
    const posted = vi.fn();

    render(<ClanPostForm onPosted={posted} />);

    fireEvent.change(screen.getByPlaceholderText('Describe your clan'), {
      target: { value: 'Join us' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tags (comma separated)'), {
      target: { value: 'war,active' },
    });
    fireEvent.change(screen.getByPlaceholderText('Open slots'), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByText('Post'));

    await waitFor(() => expect(fetchJSON).toHaveBeenCalled());

    expect(fetchJSON).toHaveBeenCalledWith(
      '/recruit',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Join us', tags: ['war', 'active'], slots: 5 }),
      })
    );
    expect(posted).toHaveBeenCalled();
  });
});
