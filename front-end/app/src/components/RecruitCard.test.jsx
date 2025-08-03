import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitCard from './RecruitCard.jsx';

test('renders recruit card with aria label', () => {
  render(
    <RecruitCard
      id="1"
      badge="/badge.png"
      name="Example Clan"
      tags={['war', 'chill']}
      openSlots={10}
      totalSlots={50}
      age="1d"
      description="Join us"
    />
  );
  expect(screen.getByRole('button', { name: /Join Example Clan/ })).toBeInTheDocument();
});
