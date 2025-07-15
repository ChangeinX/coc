import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RiskBadge, { getRiskClasses } from './RiskBadge.jsx';

describe('getRiskClasses', () => {
  it('returns class for high score', () => {
    expect(getRiskClasses(85)).toBe('bg-red-600 text-white');
    expect(getRiskClasses(65)).toBe('bg-orange-500 text-white');
    expect(getRiskClasses(45)).toBe('bg-yellow-400 text-black');
    expect(getRiskClasses(10)).toBe('bg-green-600 text-white');
  });
});

describe('RiskBadge component', () => {
  it('renders score with correct classes', () => {
    render(<RiskBadge score={65} />);
    const badge = screen.getByText('65');
    expect(badge).toHaveClass('bg-orange-500');
    expect(badge).toHaveClass('text-white');
  });
});
