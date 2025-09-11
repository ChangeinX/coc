import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DiscoveryBar } from './DiscoveryBar';

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

describe('DiscoveryBar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: jest.fn(),
    placeholder: 'Search clans...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input with placeholder', () => {
    render(<DiscoveryBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search clans...');
    expect(searchInput).toBeTruthy();
  });

  it('should display current search query value', () => {
    render(<DiscoveryBar {...defaultProps} searchQuery="war clan" />);
    
    const searchInput = screen.getByDisplayValue('war clan');
    expect(searchInput).toBeTruthy();
  });

  it('should call onSearchChange when text is entered', () => {
    const onSearchChange = jest.fn();
    render(<DiscoveryBar {...defaultProps} onSearchChange={onSearchChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search clans...');
    fireEvent.changeText(searchInput, 'new search');
    
    expect(onSearchChange).toHaveBeenCalledWith('new search');
  });

  it('should show clear button when there is search text', () => {
    render(<DiscoveryBar {...defaultProps} searchQuery="some text" />);
    
    const clearButton = screen.getByTestId('clear-search-button');
    expect(clearButton).toBeTruthy();
  });

  it('should not show clear button when search is empty', () => {
    render(<DiscoveryBar {...defaultProps} searchQuery="" />);
    
    const clearButton = screen.queryByTestId('clear-search-button');
    expect(clearButton).toBeFalsy();
  });

  it('should clear search when clear button is pressed', () => {
    const onSearchChange = jest.fn();
    render(<DiscoveryBar {...defaultProps} searchQuery="some text" onSearchChange={onSearchChange} />);
    
    const clearButton = screen.getByTestId('clear-search-button');
    fireEvent.press(clearButton);
    
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should render search icon', () => {
    render(<DiscoveryBar {...defaultProps} />);
    
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toBeTruthy();
  });

  it('should handle different placeholder text', () => {
    render(<DiscoveryBar {...defaultProps} placeholder="Find players..." />);
    
    const searchInput = screen.getByPlaceholderText('Find players...');
    expect(searchInput).toBeTruthy();
  });

  it('should be accessible with proper labels', () => {
    render(<DiscoveryBar {...defaultProps} />);
    
    const searchInput = screen.getByLabelText('Search');
    expect(searchInput).toBeTruthy();
  });

  it('should handle long search queries', () => {
    const longQuery = 'This is a very long search query that should be handled properly';
    const onSearchChange = jest.fn();
    render(<DiscoveryBar {...defaultProps} searchQuery={longQuery} onSearchChange={onSearchChange} />);
    
    const searchInput = screen.getByDisplayValue(longQuery);
    expect(searchInput).toBeTruthy();
  });
});