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
    window.__LEGAL_VERSION__ = '20250729';
    render(<LegalModal onClose={spy} />);
    screen.getByText('Accept').click();
    expect(fetchJSON).toHaveBeenCalledWith('/user/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '20250729' }),
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
