import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RiskPrioritySelect, { PRESETS, getPreset, RiskWeights } from '../RiskPrioritySelect';

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

describe('RiskPrioritySelect', () => {
  const mockWeights: RiskWeights = {
    risk_weight_war: 0.4,
    risk_weight_idle: 0.35,
    risk_weight_don_deficit: 0.15,
    risk_weight_don_drop: 0.1,
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all preset options', () => {
    const { getByText } = render(
      <RiskPrioritySelect weights={mockWeights} onSelect={mockOnSelect} />
    );

    expect(getByText('Balanced')).toBeTruthy();
    expect(getByText('War Focused')).toBeTruthy();
    expect(getByText('Donation Focused')).toBeTruthy();
    expect(getByText('Idle Focused')).toBeTruthy();
  });

  it('highlights the currently selected preset', () => {
    const { getByText } = render(
      <RiskPrioritySelect weights={mockWeights} onSelect={mockOnSelect} />
    );

    const balancedButton = getByText('Balanced');
    expect(balancedButton.props.style.color).toBe('#007AFF'); // Should be highlighted
  });

  it('calls onSelect when a preset is pressed', () => {
    const { getByText } = render(
      <RiskPrioritySelect weights={mockWeights} onSelect={mockOnSelect} />
    );

    fireEvent.press(getByText('War Focused'));

    expect(mockOnSelect).toHaveBeenCalledWith(PRESETS.war.weights);
  });

  it('correctly identifies custom weights', () => {
    const customWeights: RiskWeights = {
      risk_weight_war: 0.8,
      risk_weight_idle: 0.1,
      risk_weight_don_deficit: 0.05,
      risk_weight_don_drop: 0.05,
    };

    const { getByText } = render(
      <RiskPrioritySelect weights={customWeights} onSelect={mockOnSelect} />
    );

    // Should default to balanced for custom weights
    const balancedButton = getByText('Balanced');
    expect(balancedButton.props.style.color).toBe('#007AFF');
  });
});

describe('getPreset', () => {
  it('correctly identifies balanced preset', () => {
    const result = getPreset(PRESETS.balanced.weights);
    expect(result).toBe('balanced');
  });

  it('correctly identifies war preset', () => {
    const result = getPreset(PRESETS.war.weights);
    expect(result).toBe('war');
  });

  it('returns balanced for custom weights', () => {
    const customWeights: RiskWeights = {
      risk_weight_war: 0.8,
      risk_weight_idle: 0.1,
      risk_weight_don_deficit: 0.05,
      risk_weight_don_drop: 0.05,
    };
    const result = getPreset(customWeights);
    expect(result).toBe('balanced');
  });

  it('handles slight floating point differences', () => {
    const slightlyOffWeights: RiskWeights = {
      risk_weight_war: 0.400001, // Slightly off from 0.4
      risk_weight_idle: 0.349999, // Slightly off from 0.35
      risk_weight_don_deficit: 0.15,
      risk_weight_don_drop: 0.1,
    };
    const result = getPreset(slightlyOffWeights);
    expect(result).toBe('balanced');
  });
});

describe('PRESETS', () => {
  it('has all required presets', () => {
    expect(Object.keys(PRESETS)).toEqual(['balanced', 'war', 'donor', 'idle']);
  });

  it('all presets have required properties', () => {
    Object.values(PRESETS).forEach(preset => {
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('weights');
      expect(preset.weights).toHaveProperty('risk_weight_war');
      expect(preset.weights).toHaveProperty('risk_weight_idle');
      expect(preset.weights).toHaveProperty('risk_weight_don_deficit');
      expect(preset.weights).toHaveProperty('risk_weight_don_drop');
    });
  });

  it('all preset weights sum to approximately 1', () => {
    Object.values(PRESETS).forEach(preset => {
      const sum = Object.values(preset.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 2); // Within 0.01 of 1.0
    });
  });
});