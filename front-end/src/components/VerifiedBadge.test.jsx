import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifiedBadge from './VerifiedBadge.jsx';

describe('VerifiedBadge component', () => {
  it('renders label', () => {
    render(<VerifiedBadge />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});
