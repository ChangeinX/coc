import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitFeed from './RecruitFeed.jsx';

function noop() {}

test('renders recruit card with name', () => {
  const items = [
    {
      id: 1,
      data: {
        clanTag: '#TAG',
        name: 'Test Clan',
        labels: [],
        language: 'English',
        memberCount: 10,
      },
    },
  ];
  render(
    <RecruitFeed items={items} loadMore={noop} hasMore={false} onJoin={noop} onSelect={noop} />
  );
  expect(screen.getByText('Test Clan')).toBeInTheDocument();
});
