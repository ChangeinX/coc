import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitFeed from './RecruitFeed.jsx';
import { vi } from 'vitest';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 140,
    getVirtualItems: () => [{ index: 0, start: 0 }],
    measureElement: () => {},
  }),
}));

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
