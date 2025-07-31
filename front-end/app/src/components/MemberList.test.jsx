import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('../hooks/useCachedIcon.js', () => ({
  default: (url) => url,
}));
import MemberList from './MemberList.jsx';

const members = [
  {
    name: 'Bob',
    tag: '#B',
    townHallLevel: 10,
    leagueIcon: 'http://ex/league.png',
    last_seen: null,
    risk_score: 5,
    donations: 0,
    donationsReceived: 0,
    loyalty: 40,
  },
];

describe('MemberList', () => {
  it('calls onSelect when a row is clicked and hides the tag', () => {
    const spy = vi.fn();
    render(<MemberList members={members} height={400} onSelect={spy} />);
    screen.getByText('Bob').click();
    expect(spy).toHaveBeenCalledWith('#B');
    expect(screen.getByAltText('league')).toHaveAttribute('src', members[0].leagueIcon);
    expect(screen.queryByText('#B')).not.toBeInTheDocument();
    expect(screen.getByText('In Clan')).toBeInTheDocument();
  });
});
