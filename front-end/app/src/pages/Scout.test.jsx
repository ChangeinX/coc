import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Scout from './Scout.jsx';

describe('Scout page', () => {
  it('renders tabs', () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    expect(screen.getByText('Find a Clan')).toBeInTheDocument();
    expect(screen.getByText('Need a Clan')).toBeInTheDocument();
  });

  it('shows find a clan form by default', () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('Describe your clan')).toBeInTheDocument();
  });

  it('shows need a clan form when tab selected', () => {
    render(
      <MemoryRouter>
        <Scout />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Need a Clan'));
    expect(screen.getByPlaceholderText('Describe yourself')).toBeInTheDocument();
  });
});
