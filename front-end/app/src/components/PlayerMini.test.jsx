import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerMini from './PlayerMini.jsx';

describe('PlayerMini', () => {
  it('renders tag as link when deep_link is provided', () => {
    const player = { tag: 'ABC123', name: 'Tester', deep_link: 'https://example.com' };
    render(<PlayerMini player={player} />);
    const link = screen.getByText('ABC123');
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
  });
});
