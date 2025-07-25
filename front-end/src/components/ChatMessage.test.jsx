import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (url) => url,
}));

import ChatMessage from './ChatMessage.jsx';

const sample = { name: 'Alice', icon: 'http://ex/icon.png' };

describe('ChatMessage', () => {
  it('displays player name and icon without showing the tag', () => {
    render(
      <ChatMessage
        message={{ content: 'hi', userId: '#A1B2C' }}
        info={sample}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByAltText('league')).toHaveAttribute('src', sample.icon);
    expect(screen.queryByText('#A1B2C')).not.toBeInTheDocument();
  });

  it('dispatches add-friend event on right-click / context-menu', () => {
    const handler = vi.fn();
    window.addEventListener('open-friend-add', handler);

    render(
      <ChatMessage
        message={{ content: 'yo', senderId: '123' }}
        info={{ ...sample, tag: '#TAG' }}
      />,
    );

    // Simulate the browser’s context-menu event
    fireEvent.contextMenu(screen.getByText('yo'));

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('open-friend-add', handler);
  });

  it('dispatches add-friend event on long press (touch)', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    window.addEventListener('open-friend-add', handler);

    render(
      <ChatMessage
        message={{ content: 'yo', senderId: '123' }}
        info={{ ...sample, tag: '#TAG' }}
      />,
    );

    const el = screen.getByText('yo');
    fireEvent.pointerDown(el, { pointerType: 'touch' });
    vi.advanceTimersByTime(600);
    fireEvent.pointerUp(el, { pointerType: 'touch' });

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('open-friend-add', handler);
    vi.useRealTimers();
  });
});