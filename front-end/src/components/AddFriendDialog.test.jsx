import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddFriendDialog from './AddFriendDialog.jsx';

describe('AddFriendDialog', () => {
  it('opens in add mode when event is dispatched', async () => {
    render(<AddFriendDialog sub="123" friends={[]} />);
    window.dispatchEvent(new CustomEvent('open-friend-add'));
    expect(await screen.findByPlaceholderText('Player Tag')).toBeInTheDocument();
  });

  it('opens in remove mode when tag exists', async () => {
    render(<AddFriendDialog sub="s" friends={[{ playerTag: '#ABC' }]} />);
    window.dispatchEvent(new CustomEvent('open-friend-add', { detail: '#ABC' }));
    expect(await screen.findByText('Unfriend #ABC?')).toBeInTheDocument();
  });
});
