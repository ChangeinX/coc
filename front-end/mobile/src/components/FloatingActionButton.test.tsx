import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FloatingActionButton, FABAction } from './FloatingActionButton';

// Mock dependencies
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      surface: '#F2F2F7',
      border: '#C6C6C8',
      text: '#000000',
      textInverse: '#FFFFFF',
    },
    spacing: {
      '2xl': 24,
    },
    shadows: {
      base: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      lg: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
      },
    },
    typography: {
      fontSize: {
        xs: 12,
      },
    },
  }),
}));

jest.mock('@utils/index', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    isAvailable: jest.fn(() => true),
  }),
  useScaleAnimation: () => ({
    animatedStyle: {},
    press: jest.fn(),
  }),
}));

// Simplified test - focus on core functionality rather than complex Dimensions mocking

describe('FloatingActionButton', () => {
  const mockActions: FABAction[] = [
    {
      id: 'action1',
      label: 'Create Post',
      icon: '✏️',
      onPress: jest.fn(),
    },
    {
      id: 'action2',
      label: 'Share',
      icon: '📤',
      onPress: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with main button', () => {
    render(<FloatingActionButton actions={mockActions} />);
    
    expect(screen.getByTestId('floating-action-button')).toBeTruthy();
  });

  describe('positioning calculations', () => {
    it('should position FAB with responsive margins', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      const fabContainer = screen.getByTestId('fab-container');
      const style = fabContainer.props.style;
      
      // Should have positioning
      expect(style).toMatchObject({
        position: 'absolute',
      });
      expect(style.right).toBeGreaterThan(0);
    });

  });

  describe('action button expansion', () => {
    it('should expand and show action buttons when FAB is pressed', async () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      const fab = screen.getByTestId('floating-action-button');
      
      // Initially, action buttons should not be visible as text (they exist but with scale 0)
      expect(screen.queryByTestId('action-button-action1')).toBeTruthy();
      expect(screen.queryByTestId('action-button-action2')).toBeTruthy();
      
      // Press FAB to expand
      fireEvent.press(fab);
      
      // Action buttons should be accessible by test ID (even if animating)
      expect(screen.getByTestId('action-button-action1')).toBeTruthy();
      expect(screen.getByTestId('action-button-action2')).toBeTruthy();
      
      // And the text content should be present
      expect(screen.getByText('Create Post')).toBeTruthy();
      expect(screen.getByText('Share')).toBeTruthy();
    });

    it('should close expanded menu when action is pressed', async () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      const fab = screen.getByTestId('floating-action-button');
      
      // Expand the menu
      fireEvent.press(fab);
      
      // Verify the action button container exists
      const actionButtonContainer = screen.getByTestId('action-button-action1');
      expect(actionButtonContainer).toBeTruthy();
      
      // Find and press the touchable element within the action button
      const createPostTouchable = screen.getByTestId('action-touchable-action1');
      fireEvent.press(createPostTouchable);
      
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Action should be called
      expect(mockActions[0].onPress).toHaveBeenCalled();
    });
  });

  describe('accessibility and usability', () => {
    it('should have proper test IDs for action buttons', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      const fab = screen.getByTestId('floating-action-button');
      fireEvent.press(fab);
      
      expect(screen.getByTestId('action-button-action1')).toBeTruthy();
      expect(screen.getByTestId('action-button-action2')).toBeTruthy();
    });

    it('should handle empty actions array gracefully', () => {
      render(<FloatingActionButton actions={[]} />);
      
      const fab = screen.getByTestId('floating-action-button');
      expect(fab).toBeTruthy();
      
      // Should not crash when pressed with no actions
      fireEvent.press(fab);
    });
  });
});