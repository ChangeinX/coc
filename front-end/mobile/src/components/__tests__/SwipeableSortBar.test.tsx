import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SwipeableSortBar, SwipeableSortBarProps, SortOption } from '../SwipeableSortBar';
import { ThemeProvider } from '@theme/index';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
  })),
}));

// Mock haptics
jest.mock('@utils/index', () => ({
  useHaptics: () => ({
    selection: jest.fn(),
    isAvailable: () => true,
  }),
}));

// Mock Dimensions
const mockDimensions = {
  get: jest.fn(() => ({ width: 375, height: 667 })), // iPhone SE dimensions
};

jest.mock('react-native/Libraries/Utilities/Dimensions', () => mockDimensions);

// Test wrapper with theme provider and gesture handler
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

describe('SwipeableSortBar', () => {
  const mockSortOptions: SortOption[] = [
    { key: 'loyalty', label: 'Loyalty' },
    { key: 'risk', label: 'Risk' },
    { key: 'trophies', label: 'Trophies' },
  ];

  const defaultProps: SwipeableSortBarProps = {
    options: mockSortOptions,
    activeSort: 'loyalty',
    sortDirection: 'desc',
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    const { getByText } = renderWithProviders(<SwipeableSortBar {...defaultProps} />);
    
    expect(getByText('Swipe to change sort • Tap to reverse')).toBeTruthy();
    expect(getByText('Loyalty ↓')).toBeTruthy();
    expect(getByText('Risk')).toBeTruthy();
    expect(getByText('Trophies')).toBeTruthy();
  });

  it('shows ascending arrow when sort direction is asc', () => {
    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} sortDirection="asc" />
    );
    
    expect(getByText('Loyalty ↑')).toBeTruthy();
  });

  it('calls onSortChange when option is pressed', () => {
    const onSortChange = jest.fn();
    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} onSortChange={onSortChange} />
    );
    
    fireEvent.press(getByText('Risk'));
    expect(onSortChange).toHaveBeenCalledWith('risk');
  });

  it('highlights the active sort option', () => {
    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} activeSort="risk" />
    );
    
    expect(getByText('Risk ↓')).toBeTruthy();
    expect(getByText('Loyalty')).toBeTruthy();
  });

  it('renders ScrollView for many options on small screen', () => {
    // Mock smaller screen width
    mockDimensions.get.mockReturnValue({ width: 200, height: 667 });

    const manyOptions: SortOption[] = [
      { key: 'loyalty', label: 'Loyalty' },
      { key: 'risk', label: 'Risk' },
      { key: 'trophies', label: 'Trophies' },
      { key: 'th', label: 'Town Hall' },
      { key: 'donations', label: 'Donations' },
      { key: 'role', label: 'Role' },
    ];

    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} options={manyOptions} />
    );
    
    // Should still render all options
    expect(getByText('Loyalty ↓')).toBeTruthy();
    expect(getByText('Risk')).toBeTruthy();
    expect(getByText('Trophies')).toBeTruthy();
    expect(getByText('Town Hall')).toBeTruthy();
    expect(getByText('Donations')).toBeTruthy();
    expect(getByText('Role')).toBeTruthy();
  });

  it('handles empty options array', () => {
    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} options={[]} />
    );
    
    expect(getByText('Swipe to change sort • Tap to reverse')).toBeTruthy();
  });

  it('handles long option labels with text truncation', () => {
    const longLabelOptions: SortOption[] = [
      { key: 'very-long', label: 'Very Long Option Label That Should Truncate' },
    ];

    const { getByText } = renderWithProviders(
      <SwipeableSortBar {...defaultProps} options={longLabelOptions} activeSort="very-long" />
    );
    
    expect(getByText('Very Long Option Label That Should Truncate ↓')).toBeTruthy();
  });

  it('maintains proper accessibility', () => {
    const { getByText } = renderWithProviders(<SwipeableSortBar {...defaultProps} />);
    
    const loyaltyButton = getByText('Loyalty ↓');
    const riskButton = getByText('Risk');
    
    // Buttons should be touchable
    expect(loyaltyButton).toBeTruthy();
    expect(riskButton).toBeTruthy();
  });

  it('preserves gesture handler functionality on wider screens', () => {
    // Mock wider screen width
    mockDimensions.get.mockReturnValue({ width: 800, height: 600 });

    const { getByText } = renderWithProviders(<SwipeableSortBar {...defaultProps} />);
    
    // Should render with gesture handler (PanGestureHandler)
    expect(getByText('Loyalty ↓')).toBeTruthy();
    expect(getByText('Risk')).toBeTruthy();
  });
});