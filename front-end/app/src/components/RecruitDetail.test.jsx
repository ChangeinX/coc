import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitDetail from './RecruitDetail.jsx';

vi.mock('./RecruitCard.jsx', () => ({
  default: (props) => <div data-testid="card">{props.name}</div>,
}));

const clan = {
  clanTag: '#1',
  deepLink: 'link',
  name: 'Clan',
  labels: [],
  language: 'EN',
  memberCount: 10,
  warLeague: { name: 'Gold' },
  clanLevel: 3,
  requiredTrophies: 1000,
  requiredTownhallLevel: 9,
};

test('outside click closes modal', () => {
  const handleClose = vi.fn();
  render(<RecruitDetail clan={clan} onClose={handleClose} />);
  fireEvent.click(document.querySelector('.z-50'));
  expect(handleClose).toHaveBeenCalled();
});

test('inside click does not close modal', () => {
  const handleClose = vi.fn();
  render(<RecruitDetail clan={clan} onClose={handleClose} />);
  fireEvent.click(document.querySelector('.bg-white'));
  expect(handleClose).not.toHaveBeenCalled();
});
