import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(),
  API_URL: '',
}));

import DisclaimerModal from './DisclaimerModal.jsx';
import { fetchJSON } from '../lib/api.js';

describe('DisclaimerModal', () => {
  it('posts on acknowledge and calls onClose', async () => {
    const spy = vi.fn();
    render(<DisclaimerModal onClose={spy} />);
    screen.getByText('OK').click();
    expect(fetchJSON).toHaveBeenCalledWith('/user/disclaimer', { method: 'POST' });
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
