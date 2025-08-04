import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitCard from './RecruitCard.jsx';

vi.mock('./CachedImage.jsx', () => ({
  default: (props) => <img {...props} />,
}));

test('renders recruit card and toggles label names', () => {
  const labels = [{ id: 1, name: 'Label1', iconUrls: { small: '/l1.png' } }];
  render(
    <RecruitCard
      clanTag="#CLAN"
      deepLink="https://link"
      name="Clan"
      description="Desc"
      labels={labels}
      openSlots={10}
      warFrequency="Always"
      language="EN"
      callToAction="Join us"
    />
  );

  expect(screen.getByRole('link', { name: '#CLAN' })).toHaveAttribute(
    'href',
    'https://link'
  );
  expect(screen.getByText('10 open slots')).toBeInTheDocument();
  expect(screen.queryByText('Label1')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Label1')).toBeInTheDocument();
});

