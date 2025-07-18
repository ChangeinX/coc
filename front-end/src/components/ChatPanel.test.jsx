import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../hooks/useChat.js', () => ({
  default: () => ({ messages: [] }),
}));
vi.mock('../lib/api.js', () => ({ fetchJSON: vi.fn() }));

import ChatPanel from './ChatPanel.jsx';

describe('ChatPanel component', () => {
  it('renders input field', () => {
    render(<ChatPanel />);
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });

  it('shows coming soon on Friends tab', () => {
    render(<ChatPanel />);
    const friendsTab = screen.getByText('Friends');
    fireEvent.click(friendsTab);
    expect(screen.getByText('Coming soon...')).toBeInTheDocument();
  });
});
