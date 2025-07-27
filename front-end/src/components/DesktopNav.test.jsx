import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import DesktopNav from './DesktopNav.jsx';

describe('DesktopNav', () => {
  it('renders basic nav items', () => {
    render(
      <MemoryRouter>
        <DesktopNav />
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
        <DesktopNav badgeCount={2} />
      </MemoryRouter>
    );
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });
});
