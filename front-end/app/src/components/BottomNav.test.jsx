import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

describe('BottomNav', () => {
  it('renders basic nav items', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Scout')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('shows badge when count provided', () => {
    render(
      <MemoryRouter>
        <BottomNav badgeCount={3} />
      </MemoryRouter>
    );
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
  });
});
