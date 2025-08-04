import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RecruitCard from './RecruitCard.jsx';

test('renders recruit card with aria label', () => {
  render(
    <RecruitCard callToAction="Join us" age="1d" />
  );
  expect(screen.getByRole('button', { name: /Join clan/ })).toBeInTheDocument();
});
