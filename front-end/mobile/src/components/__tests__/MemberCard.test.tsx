import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberCard, MemberCardProps, Member } from '../MemberCard';
import { ThemeProvider } from '@theme/index';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
  })),
}));

// Test wrapper with theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('MemberCard', () => {
  const mockMember: Member = {
    tag: '#123ABC',
    name: 'Test Player',
    role: 'Member',
    townHallLevel: 12,
    trophies: 3200,
    donations: 150,
    donationsReceived: 75,
    loyalty: 45,
    risk_score: 25,
    last_seen: '2024-01-01T12:00:00Z',
    risk_breakdown: [
      { points: 15, reason: 'Low donations' },
      { points: 10, reason: 'Recent join' }
    ],
    deep_link: 'https://link.clashofclans.com/?action=OpenPlayerProfile&tag=123ABC'
  };

  const defaultProps: MemberCardProps = {
    member: mockMember,
  };

  it('renders member basic information', () => {
    const { getByText } = renderWithTheme(<MemberCard {...defaultProps} />);
    
    expect(getByText('Test Player')).toBeTruthy();
    expect(getByText('Member')).toBeTruthy();
    expect(getByText('#123ABC')).toBeTruthy();
  });

  it('renders member stats', () => {
    const { getByText } = renderWithTheme(<MemberCard {...defaultProps} />);
    
    expect(getByText('TH 12')).toBeTruthy();
    expect(getByText('3,200')).toBeTruthy();
    expect(getByText('150/75')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
  });

  it('renders risk assessment when showRisk is true', () => {
    const { getByText } = renderWithTheme(
      <MemberCard {...defaultProps} showRisk={true} />
    );
    
    expect(getByText('Risk Assessment')).toBeTruthy();
    expect(getByText('25')).toBeTruthy();
    expect(getByText('Low')).toBeTruthy();
  });

  it('does not render risk assessment when showRisk is false', () => {
    const { queryByText } = renderWithTheme(
      <MemberCard {...defaultProps} showRisk={false} />
    );
    
    expect(queryByText('Risk Assessment')).toBeNull();
  });

  it('renders in compact mode', () => {
    const { queryByText } = renderWithTheme(
      <MemberCard {...defaultProps} compact={true} />
    );
    
    // Name should still be visible
    expect(queryByText('Test Player')).toBeTruthy();
    // But detailed stats should not be visible in compact mode
    expect(queryByText('Town Hall')).toBeNull();
  });

  it('handles onPress correctly', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <MemberCard {...defaultProps} onPress={onPress} />
    );
    
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockMember);
  });

  it('formats time ago correctly', () => {
    // Mock Date.now to return a fixed timestamp
    const mockNow = new Date('2024-01-01T14:30:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());
    
    const { getByText } = renderWithTheme(<MemberCard {...defaultProps} />);
    
    // Should show "2h ago" (difference between 12:00 and 14:30)
    expect(getByText('2h ago')).toBeTruthy();
    
    jest.restoreAllMocks();
  });

  it('handles member without last_seen', () => {
    const memberWithoutLastSeen: Member = {
      ...mockMember,
      last_seen: undefined,
    };

    const { getByText } = renderWithTheme(
      <MemberCard member={memberWithoutLastSeen} />
    );
    
    expect(getByText('—')).toBeTruthy();
  });

  it('handles member without role', () => {
    const memberWithoutRole: Member = {
      ...mockMember,
      role: undefined,
    };

    const { getByText, queryByText } = renderWithTheme(
      <MemberCard member={memberWithoutRole} />
    );
    
    expect(getByText('Test Player')).toBeTruthy();
    expect(queryByText('Member')).toBeNull();
  });

  it('renders risk breakdown correctly', () => {
    const { getByText } = renderWithTheme(
      <MemberCard {...defaultProps} showRisk={true} />
    );
    
    expect(getByText(/Low donations \(15 pts\)/)).toBeTruthy();
    expect(getByText(/Recent join \(10 pts\)/)).toBeTruthy();
  });

  it('handles high risk score', () => {
    const highRiskMember: Member = {
      ...mockMember,
      risk_score: 85,
    };

    const { getByText } = renderWithTheme(
      <MemberCard member={highRiskMember} showRisk={true} />
    );
    
    expect(getByText('85')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
  });

  it('handles medium risk score', () => {
    const mediumRiskMember: Member = {
      ...mockMember,
      risk_score: 50,
    };

    const { getByText } = renderWithTheme(
      <MemberCard member={mediumRiskMember} showRisk={true} />
    );
    
    expect(getByText('50')).toBeTruthy();
    expect(getByText('Medium')).toBeTruthy();
  });

  it('handles member without risk data', () => {
    const memberWithoutRisk: Member = {
      ...mockMember,
      risk_score: undefined,
      risk_breakdown: undefined,
    };

    const { queryByText } = renderWithTheme(
      <MemberCard member={memberWithoutRisk} showRisk={true} />
    );
    
    // Risk assessment section should still render but with low risk
    expect(queryByText('Risk Assessment')).toBeTruthy();
    expect(queryByText('0')).toBeTruthy();
    expect(queryByText('Low')).toBeTruthy();
  });
});