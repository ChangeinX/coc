import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scout from './Scout.jsx';

describe('Scout page', () => {
  it('renders tabs', () => {
    render(<Scout />);
    expect(screen.getByText('Find a Clan')).toBeInTheDocument();
    expect(screen.getByText('Need a Clan')).toBeInTheDocument();
  });
});
