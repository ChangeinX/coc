import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  fetchJSON: vi.fn(),
  API_URL: '',
}));

import LegalModal from './LegalModal.jsx';
import { fetchJSON } from '../lib/api.js';

describe('LegalModal', () => {
  it('posts acceptance and closes', async () => {
    const spy = vi.fn();
    render(<LegalModal onClose={spy} />);
    screen.getByText('Accept').click();
    expect(fetchJSON).toHaveBeenCalledWith('/user/legal', { method: 'POST' });
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
