import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ClanPostForm } from './ClanPostForm';

// Mock the theme and utils
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#007AFF',
      secondary: '#8E8E93',
      border: '#C6C6C8',
      card: '#F2F2F7',
      success: '#34C759',
      error: '#FF3B30',
    },
  }),
  useThemedStyles: () => ({
    container: { backgroundColor: '#FFFFFF' },
    text: { color: '#000000' },
  }),
}));

jest.mock('@utils/index', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    isAvailable: true,
  }),
}));

describe('ClanPostForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<ClanPostForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell players about your clan...')).toBeTruthy();
  });

  it('should render submit and cancel buttons', () => {
    render(<ClanPostForm {...defaultProps} />);
    
    expect(screen.getByText('Create Post')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    render(<ClanPostForm {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('should update clan tag when text is entered', () => {
    render(<ClanPostForm {...defaultProps} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    fireEvent.changeText(clanTagInput, '#TESTCLAN');
    
    expect(clanTagInput.props.value).toBe('#TESTCLAN');
  });

  it('should update call to action when text is entered', () => {
    render(<ClanPostForm {...defaultProps} />);
    
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    fireEvent.changeText(callToActionInput, 'Join our active war clan!');
    
    expect(callToActionInput.props.value).toBe('Join our active war clan!');
  });

  it('should not submit when clan tag is empty', async () => {
    const onSubmit = jest.fn();
    render(<ClanPostForm {...defaultProps} onSubmit={onSubmit} />);
    
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    fireEvent.changeText(callToActionInput, 'Some description');
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.press(submitButton);
    
    expect(screen.getByText('Clan tag is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit when call to action is empty', async () => {
    const onSubmit = jest.fn();
    render(<ClanPostForm {...defaultProps} onSubmit={onSubmit} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    fireEvent.changeText(clanTagInput, '#TESTCLAN');
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.press(submitButton);
    
    expect(screen.getByText('Description is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit when all fields are valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ClanPostForm {...defaultProps} onSubmit={onSubmit} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    
    fireEvent.changeText(clanTagInput, '#TESTCLAN');
    fireEvent.changeText(callToActionInput, 'Join our active war clan!');
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        clanTag: '#TESTCLAN',
        callToAction: 'Join our active war clan!',
      });
    });
  });

  it('should show loading state when submitting', () => {
    render(<ClanPostForm {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Creating...')).toBeTruthy();
  });

  it('should disable form when loading', () => {
    render(<ClanPostForm {...defaultProps} isLoading={true} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    
    expect(clanTagInput.props.editable).toBe(false);
    expect(callToActionInput.props.editable).toBe(false);
    expect(screen.getByText('Creating...')).toBeTruthy();
  });

  it('should validate clan tag format', async () => {
    const onSubmit = jest.fn();
    render(<ClanPostForm {...defaultProps} onSubmit={onSubmit} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    
    fireEvent.changeText(clanTagInput, 'INVALIDTAG');
    fireEvent.changeText(callToActionInput, 'Description');
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.press(submitButton);
    
    expect(screen.getByText('Clan tag must start with #')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should clear validation errors when correcting input', async () => {
    render(<ClanPostForm {...defaultProps} />);
    
    const clanTagInput = screen.getByPlaceholderText('Enter clan tag (e.g., #ABC123)');
    const submitButton = screen.getByText('Create Post');
    
    // Trigger validation error
    fireEvent.press(submitButton);
    expect(screen.getByText('Clan tag is required')).toBeTruthy();
    
    // Fix the error
    fireEvent.changeText(clanTagInput, '#VALIDTAG');
    
    // Error should be cleared
    expect(screen.queryByText('Clan tag is required')).toBeFalsy();
  });

  it('should handle long call to action text', () => {
    const longText = 'This is a very long call to action text that should be handled properly by the form component and should not cause any issues with the UI layout or functionality';
    
    render(<ClanPostForm {...defaultProps} />);
    
    const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
    fireEvent.changeText(callToActionInput, longText);
    
    expect(callToActionInput.props.value).toBe(longText);
  });

  describe('Auto-population functionality', () => {
    const propsWithClanTag = {
      ...defaultProps,
      clanTag: '#CLAN123',
    };

    it('should render with pre-filled and read-only clan tag when provided', () => {
      render(<ClanPostForm {...propsWithClanTag} />);
      
      const clanTagInput = screen.getByDisplayValue('#CLAN123');
      expect(clanTagInput.props.editable).toBe(false);
    });

    it('should show helper text when clan tag is auto-populated', () => {
      render(<ClanPostForm {...propsWithClanTag} />);
      
      expect(screen.getByText('Using your current clan')).toBeTruthy();
    });

    it('should submit with pre-populated clan tag', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      
      render(<ClanPostForm {...propsWithClanTag} onSubmit={onSubmit} />);
      
      const callToActionInput = screen.getByPlaceholderText('Tell players about your clan...');
      const submitButton = screen.getByText('Create Post');
      
      fireEvent.changeText(callToActionInput, 'Join our active war clan!');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          clanTag: '#CLAN123',
          callToAction: 'Join our active war clan!',
        });
      });
    });

    it('should only validate call to action when clan tag is pre-filled', async () => {
      const onSubmit = jest.fn();
      render(<ClanPostForm {...propsWithClanTag} onSubmit={onSubmit} />);
      
      const submitButton = screen.getByText('Create Post');
      fireEvent.press(submitButton);
      
      // Should not show clan tag error since it's pre-filled
      expect(screen.queryByText('Clan tag is required')).toBeFalsy();
      expect(screen.queryByText('Clan tag must start with #')).toBeFalsy();
      
      // Should still show call to action error
      expect(screen.getByText('Description is required')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show helper text about backend auto-population', () => {
      render(<ClanPostForm {...defaultProps} />);
      
      expect(screen.getByText('Clan details, level, and member count will be automatically included')).toBeTruthy();
    });
  });
});