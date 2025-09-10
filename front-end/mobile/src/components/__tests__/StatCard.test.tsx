import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatCard, StatCardProps } from '../StatCard';
import { ThemeProvider } from '@theme/index';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
  })),
}));

// Mock utils
jest.mock('@utils/index', () => ({
  useHaptics: () => ({
    light: jest.fn().mockResolvedValue(undefined),
    isAvailable: () => true,
  }),
  useScaleAnimation: () => ({
    animatedStyle: {},
    press: () => ({ start: jest.fn() }),
  }),
}));

// Test wrapper with theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('StatCard', () => {
  const defaultProps: StatCardProps = {
    label: 'Test Label',
    value: 42,
  };

  it('renders with basic props', () => {
    const { getByText } = renderWithTheme(<StatCard {...defaultProps} />);
    
    expect(getByText('Test Label')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });

  it('renders with icon', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} icon="🏆" />
    );
    
    expect(getByText('🏆')).toBeTruthy();
  });

  it('renders with subtitle', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} subtitle="Test subtitle" />
    );
    
    expect(getByText('Test subtitle')).toBeTruthy();
  });

  it('handles onPress correctly', async () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} onPress={onPress} />
    );
    
    // Press the card content area
    fireEvent.press(getByText('Test Label'));
    
    // Wait for async haptic feedback
    await new Promise(resolve => setImmediate(resolve));
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies success variant styling', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} variant="success" />
    );
    
    // Component should render without errors
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('applies warning variant styling', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} variant="warning" />
    );
    
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('applies error variant styling', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} variant="error" />
    );
    
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('renders different sizes correctly', () => {
    const { getByText: getSmall } = renderWithTheme(
      <StatCard {...defaultProps} size="sm" />
    );
    expect(getSmall('Test Label')).toBeTruthy();

    const { getByText: getMedium } = renderWithTheme(
      <StatCard {...defaultProps} size="md" />
    );
    expect(getMedium('Test Label')).toBeTruthy();

    const { getByText: getLarge } = renderWithTheme(
      <StatCard {...defaultProps} size="lg" />
    );
    expect(getLarge('Test Label')).toBeTruthy();
  });

  it('handles string values', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} value="High" />
    );
    
    expect(getByText('High')).toBeTruthy();
  });

  it('handles zero values', () => {
    const { getByText } = renderWithTheme(
      <StatCard {...defaultProps} value={0} />
    );
    
    expect(getByText('0')).toBeTruthy();
  });
});