import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitCard from './RecruitCard.jsx';

vi.mock('./CachedImage.jsx', () => ({
  default: (props) => <img {...props} />,
}));

test('renders summary info and handles click', () => {
  const handleClick = vi.fn();
  render(
    <RecruitCard
      clanTag="#CLAN"
      deepLink="https://link"
      name="Clan"
      labels={[{ id: 1, name: 'Label1', iconUrls: { small: '/l1.png' } }]}
      chatLanguage={{ name: 'EN' }}
      members={30}
      warLeague={{ name: 'Gold League' }}
      clanLevel={5}
      requiredTrophies={1200}
      requiredTownhallLevel={8}
      callToAction="Join us!"
      onClick={handleClick}
    />
  );
  expect(screen.getByText('Clan')).toBeInTheDocument();
  expect(screen.getByText('EN')).toBeInTheDocument();
  expect(screen.getByText('Join us!')).toBeInTheDocument();
  expect(screen.getByText('30/50')).toBeInTheDocument();
  expect(screen.getByText('Gold League')).toBeInTheDocument();
  expect(screen.getByText('Lv 5')).toBeInTheDocument();
  expect(screen.getByText('1200+')).toBeInTheDocument();
  expect(screen.getByText('TH 8+')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});

