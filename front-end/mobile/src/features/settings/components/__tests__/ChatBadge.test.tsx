import React from 'react';
import { render } from '@testing-library/react-native';
import ChatBadge from '../ChatBadge';

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

describe('ChatBadge', () => {
  it('renders correctly', () => {
    const { getByText } = render(<ChatBadge />);
    
    expect(getByText('💬 Chat')).toBeTruthy();
  });

  it('has correct styling', () => {
    const { getByText } = render(<ChatBadge />);
    
    const badge = getByText('💬 Chat');
    expect(badge.props.style).toMatchObject({
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    });
  });
});