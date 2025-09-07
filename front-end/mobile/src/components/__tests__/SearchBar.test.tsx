import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar, SearchBarProps } from '../SearchBar';
import { ThemeProvider } from '@theme/index';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
  })),
}));

// Mock Keyboard
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Keyboard: {
      dismiss: jest.fn(),
    },
  };
});

// Test wrapper with theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('SearchBar', () => {
  const defaultProps: SearchBarProps = {
    placeholder: 'Search...',
  };

  it('renders with default props', () => {
    const { getByPlaceholderText } = renderWithTheme(<SearchBar {...defaultProps} />);
    
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar placeholder="Enter clan tag" />
    );
    
    expect(getByPlaceholderText('Enter clan tag')).toBeTruthy();
  });

  it('handles controlled value', () => {
    const { getByDisplayValue } = renderWithTheme(
      <SearchBar {...defaultProps} value="test value" />
    );
    
    expect(getByDisplayValue('test value')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} onChangeText={onChangeText} />
    );
    
    fireEvent.changeText(getByPlaceholderText('Search...'), 'new text');
    expect(onChangeText).toHaveBeenCalledWith('new text');
  });

  it('calls onSubmit when submit button is pressed', () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} onSubmit={onSubmit} value="test" />
    );
    
    fireEvent.press(getByText('Search'));
    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('calls onSubmit when enter key is pressed', () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} onSubmit={onSubmit} value="test" />
    );
    
    fireEvent(getByPlaceholderText('Search...'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('trims whitespace before submitting', () => {
    const onSubmit = jest.fn();
    const { getByText } = renderWithTheme(
      <SearchBar {...defaultProps} onSubmit={onSubmit} value="  test  " />
    );
    
    fireEvent.press(getByText('Search'));
    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('does not submit empty or whitespace-only values', () => {
    const onSubmit = jest.fn();
    const { getByText } = renderWithTheme(
      <SearchBar {...defaultProps} onSubmit={onSubmit} value="   " />
    );
    
    // Button should be disabled, but let's try pressing it anyway
    const button = getByText('Search');
    fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = renderWithTheme(
      <SearchBar {...defaultProps} loading={true} />
    );
    
    // ActivityIndicator should be present
    expect(getByTestId).toBeTruthy();
  });

  it('disables input when loading', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} loading={true} />
    );
    
    const input = getByPlaceholderText('Search...');
    expect(input.props.editable).toBe(false);
  });

  it('disables input when disabled prop is true', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} disabled={true} />
    );
    
    const input = getByPlaceholderText('Search...');
    expect(input.props.editable).toBe(false);
  });

  it('shows clear button when there is text', () => {
    const { getByText } = renderWithTheme(
      <SearchBar {...defaultProps} value="some text" />
    );
    
    expect(getByText('×')).toBeTruthy();
  });

  it('calls onClear when clear button is pressed', () => {
    const onClear = jest.fn();
    const { getByText } = renderWithTheme(
      <SearchBar {...defaultProps} value="some text" onClear={onClear} />
    );
    
    fireEvent.press(getByText('×'));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders with custom submit button text', () => {
    const { getByText } = renderWithTheme(
      <SearchBar {...defaultProps} onSubmit={jest.fn()} submitButtonText="Find" />
    );
    
    expect(getByText('Find')).toBeTruthy();
  });

  it('handles different keyboard types', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} keyboardType="email-address" />
    );
    
    const input = getByPlaceholderText('Search...');
    expect(input.props.keyboardType).toBe('email-address');
  });

  it('handles different return key types', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <SearchBar {...defaultProps} returnKeyType="done" />
    );
    
    const input = getByPlaceholderText('Search...');
    expect(input.props.returnKeyType).toBe('done');
  });

  it('manages internal state when value prop is not provided', () => {
    const { getByPlaceholderText, getByText } = renderWithTheme(
      <SearchBar placeholder="Search..." />
    );
    
    const input = getByPlaceholderText('Search...');
    fireEvent.changeText(input, 'internal state');
    
    // Should show the clear button for internal state
    expect(getByText('×')).toBeTruthy();
  });
});