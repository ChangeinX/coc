import React from 'react';
import { render } from '@testing-library/react-native';
import VerifiedBadge from '../VerifiedBadge';

// Mock theme hook
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      border: '#E5E5E7',
      text: '#000000',
    },
  }),
}));

describe('VerifiedBadge', () => {
  it('renders correctly', () => {
    const { getByText } = render(<VerifiedBadge />);
    
    expect(getByText('✓ Verified')).toBeTruthy();
  });

  it('has correct styling', () => {
    const { getByText } = render(<VerifiedBadge />);
    
    const badge = getByText('✓ Verified');
    expect(badge.props.style).toMatchObject({
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    });
  });
});