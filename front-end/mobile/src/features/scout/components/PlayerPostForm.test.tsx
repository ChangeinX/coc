import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PlayerPostForm from './PlayerPostForm';

// Mock theme
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F2F2F7',
      border: '#C6C6C8',
      text: '#000000',
      textSecondary: '#8E8E93',
      primary: '#007AFF',
      error: '#FF3B30',
    },
  }),
}));

// Mock utils
jest.mock('@utils/index', () => ({
  useHaptics: () => ({
    light: jest.fn(),
  }),
}));

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

describe('PlayerPostForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false,
  };

  it('renders correctly with call to action field', () => {
    render(<PlayerPostForm {...defaultProps} />);
    
    expect(screen.getByText('Create Player Post')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell clans why they should recruit you...')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Create Post')).toBeTruthy();
  });

  it('shows validation error when call to action is empty', async () => {
    render(<PlayerPostForm {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please tell clans why they should recruit you')).toBeTruthy();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<PlayerPostForm {...defaultProps} />);
    
    const textInput = screen.getByPlaceholderText('Tell clans why they should recruit you...');
    const submitButton = screen.getByText('Create Post');
    
    fireEvent.changeText(textInput, 'I am a skilled player looking for an active war clan');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        description: 'I am a skilled player looking for an active war clan',
      });
    });
  });

  it('shows loading state correctly', () => {
    render(<PlayerPostForm {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Creating...')).toBeTruthy();
    expect(screen.queryByText('Create Post')).toBeNull();
  });

  it('calls onCancel when cancel button is pressed', () => {
    render(<PlayerPostForm {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('clears validation error when user starts typing', async () => {
    render(<PlayerPostForm {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Post');
    const textInput = screen.getByPlaceholderText('Tell clans why they should recruit you...');
    
    // Trigger validation error
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please tell clans why they should recruit you')).toBeTruthy();
    });
    
    // Start typing
    fireEvent.changeText(textInput, 'I');
    
    await waitFor(() => {
      expect(screen.queryByText('Please tell clans why they should recruit you')).toBeNull();
    });
  });

  it('trims whitespace from call to action', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<PlayerPostForm {...defaultProps} />);
    
    const textInput = screen.getByPlaceholderText('Tell clans why they should recruit you...');
    const submitButton = screen.getByText('Create Post');
    
    fireEvent.changeText(textInput, '  I am a skilled player  ');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        description: 'I am a skilled player',
      });
    });
  });

  it('shows helper text about what backend automatically provides', () => {
    render(<PlayerPostForm {...defaultProps} />);
    
    expect(screen.getByText('Your player profile, league, and stats will be automatically included')).toBeTruthy();
  });
});