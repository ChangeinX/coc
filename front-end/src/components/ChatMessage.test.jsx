import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (url) => url,
}));
vi.mock('../lib/api.js', () => ({
  fetchJSONCached: vi.fn(),
  API_URL: '',
}));

import ChatMessage from './ChatMessage.jsx';
import { fetchJSONCached } from '../lib/api.js';

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

  it('dispatches add friend event on right click', () => {
    const handler = vi.fn();
    window.addEventListener('open-friend-add', handler);
    render(
      <ChatMessage
        message={{ content: 'yo', senderId: '123' }}
        info={{ ...sample, tag: '#TAG' }}
      />,
    );
    fireEvent.contextMenu(screen.getByText('yo'));
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('open-friend-add', handler);
  });

  it('dispatches add friend event on long press', () => {
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

  it('renders mentioned player from tag', async () => {
    fetchJSONCached.mockResolvedValue({
      name: 'Bob',
      tag: '#TAG',
      leagueIcon: 'http://ex/b.png',
    });
    render(
      <ChatMessage
        message={{ content: 'hi @{#TAG}', userId: '#A1B2C' }}
        info={sample}
      />,
    );
    const mention = await screen.findByText('Bob');
    expect(mention).toBeInTheDocument();
    const strong = mention.closest('strong');
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveClass('text-slate-900');
    expect(strong).toHaveClass('underline');
    expect(fetchJSONCached).toHaveBeenCalledWith('/player/%23TAG');
  });
});
