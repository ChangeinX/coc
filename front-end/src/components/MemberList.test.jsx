import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MemberList from './MemberList.jsx';

const members = [
  { name: 'Bob', tag: '#B', townHallLevel: 10, last_seen: null, risk_score: 5, donations:0, donationsReceived:0 },
];

describe('MemberList', () => {
  it('calls onSelect when a row is clicked', () => {
    const spy = vi.fn();
    render(<MemberList members={members} height={400} onSelect={spy} />);
    screen.getByText('Bob').click();
    expect(spy).toHaveBeenCalledWith('#B');
  });
});
