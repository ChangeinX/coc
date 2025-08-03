import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import PlayerRecruitCard from './PlayerRecruitCard.jsx';

test('renders player recruit card with aria label', () => {
  render(
    <PlayerRecruitCard
      id="1"
      avatar="/avatar.png"
      name="Example Player"
      tag="#ABC"
      age="1d"
      description="Looking for clan"
    />
  );
  expect(screen.getByRole('button', { name: /Invite Example Player/ })).toBeInTheDocument();
});
