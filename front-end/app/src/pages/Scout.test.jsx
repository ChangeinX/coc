import { render, screen } from '@testing-library/react';
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
});
