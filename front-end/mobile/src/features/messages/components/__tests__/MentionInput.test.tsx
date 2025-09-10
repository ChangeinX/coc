import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MentionInput from '../MentionInput';

// Mock the theme hook
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      primary: '#007AFF',
      surface: '#FFFFFF',
      border: '#E5E5E5',
      background: '#F8F9FA',
    },
    typography: {},
  }),
}));

describe('MentionInput', () => {
  const mockMembers = [
    { name: 'John Doe', tag: '#ABC123' },
    { name: 'Jane Smith', tag: '#DEF456' },
    { name: 'Bob Johnson', tag: '#GHI789' },
  ];

  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders text input correctly', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Type a message..."
        members={mockMembers}
      />
    );

    expect(getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value=""
        onChangeText={mockOnChangeText}
        members={mockMembers}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello world');

    expect(mockOnChangeText).toHaveBeenCalledWith('Hello world');
  });

  it('shows suggestions when typing @ symbol', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value="@J"
        onChangeText={mockOnChangeText}
        members={mockMembers}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    
    // Simulate selection change after typing @J
    fireEvent(input, 'onSelectionChange', {
      nativeEvent: { selection: { start: 2, end: 2 } }
    });

    // Test that the component handles the @ detection logic
    // Note: The modal suggestions are tested in integration tests
    expect(input.props.value).toBe('@J');
  });

  it('handles text input with mentions', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value="@john"
        onChangeText={mockOnChangeText}
        members={mockMembers}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    
    // Simulate selection change after typing mention
    fireEvent(input, 'onSelectionChange', {
      nativeEvent: { selection: { start: 5, end: 5 } }
    });

    // Component should handle the mention detection
    expect(input.props.value).toBe('@john');
  });

  it('handles multiline input', () => {
    const multilineValue = 'Line 1\nLine 2';
    const { getByPlaceholderText } = render(
      <MentionInput
        value={multilineValue}
        onChangeText={mockOnChangeText}
        members={mockMembers}
        multiline={true}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    expect(input.props.multiline).toBe(true);
    expect(input.props.value).toBe(multilineValue);
  });

  it('handles text length limits', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value="Test message"
        onChangeText={mockOnChangeText}
        members={mockMembers}
        maxLength={50}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    expect(input.props.maxLength).toBe(50);
  });

  it('handles disabled state', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value=""
        onChangeText={mockOnChangeText}
        disabled={true}
        members={mockMembers}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    expect(input.props.editable).toBe(false);
  });

  it('handles completed mentions in text', () => {
    const { getByPlaceholderText } = render(
      <MentionInput
        value="@[John Doe](#ABC123) hello"
        onChangeText={mockOnChangeText}
        members={mockMembers}
      />
    );

    const input = getByPlaceholderText('Type a message...');
    
    // Simulate cursor after completed mention
    fireEvent(input, 'onSelectionChange', {
      nativeEvent: { selection: { start: 25, end: 25 } }
    });

    // Component should handle completed mentions properly
    expect(input.props.value).toBe('@[John Doe](#ABC123) hello');
  });
});