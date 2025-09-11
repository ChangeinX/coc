import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { RecruitCard } from './RecruitCard';
import type { ClanRecruitPost } from '../api/recruitingApi';

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
  useScaleAnimation: () => ({
    animatedStyle: {},
    press: jest.fn(),
  }),
}));

const mockRecruitPost: ClanRecruitPost = {
  id: 1,
  data: {
    clanTag: '#ABC123',
    deepLink: 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=ABC123',
    name: 'Test Clan',
    description: 'A great clan for wars',
    labels: [
      {
        id: 1,
        name: 'War Focused',
        iconUrls: {
          small: 'https://example.com/icon.png',
        },
      },
    ],
    warFrequency: 'always',
    warLeague: {
      id: 1,
      name: 'Crystal League I',
    },
    clanLevel: 15,
    language: 'English',
    memberCount: 45,
    requiredTrophies: 2000,
    requiredTownhallLevel: 11,
    requiredBuilderBaseTrophies: 1500,
    callToAction: 'Join our active war clan! We donate frequently and help each other grow.',
  },
  createdAt: '2024-01-01T12:00:00Z',
};

describe('RecruitCard', () => {
  it('should render clan name and tag', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Test Clan')).toBeTruthy();
    expect(screen.getByText('#ABC123')).toBeTruthy();
  });

  it('should render call to action when provided', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Join our active war clan! We donate frequently and help each other grow.')).toBeTruthy();
  });

  it('should render requirements section when requirements are provided', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Requirements')).toBeTruthy();
    expect(screen.getByText('TH 11+')).toBeTruthy();
    expect(screen.getByText('2000+ Trophies')).toBeTruthy();
    expect(screen.getByText('1500+ Builder Trophies')).toBeTruthy();
  });

  it('should render clan info section', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Clan Info')).toBeTruthy();
    expect(screen.getByText('👥 45/50')).toBeTruthy();
    expect(screen.getByText('🛡️ Crystal League I')).toBeTruthy();
    expect(screen.getByText('👑 Level 15')).toBeTruthy();
    expect(screen.getByText('🏷️ War Focused')).toBeTruthy();
  });

  it('should render language when provided', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Language: English')).toBeTruthy();
  });

  it('should render time ago for created date', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    // Should contain some time text (exact format may vary)
    expect(screen.getByText(/ago|hours|days|minutes/)).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const onPress = jest.fn();
    render(<RecruitCard post={mockRecruitPost} onPress={onPress} onJoin={jest.fn()} />);
    
    const card = screen.getByTestId('recruit-card');
    fireEvent.press(card);
    
    expect(onPress).toHaveBeenCalledWith(mockRecruitPost);
  });

  it('should call onJoin when join button is pressed', () => {
    const onJoin = jest.fn();
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={onJoin} />);
    
    const joinButton = screen.getByText('Join');
    fireEvent.press(joinButton);
    
    expect(onJoin).toHaveBeenCalledWith(mockRecruitPost);
  });

  it('should handle missing optional data gracefully', () => {
    const minimalPost: ClanRecruitPost = {
      id: 2,
      data: {
        clanTag: '#MINIMAL',
        name: 'Minimal Clan',
      },
      createdAt: '2024-01-01T12:00:00Z',
    };

    render(<RecruitCard post={minimalPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.getByText('Minimal Clan')).toBeTruthy();
    expect(screen.getByText('#MINIMAL')).toBeTruthy();
    // Should not crash when optional data is missing
  });

  it('should not render requirements section when no requirements', () => {
    const { requiredTrophies, requiredTownhallLevel, requiredBuilderBaseTrophies, ...dataWithoutRequirements } = mockRecruitPost.data;
    const noRequirementsPost: ClanRecruitPost = {
      ...mockRecruitPost,
      data: dataWithoutRequirements,
    };

    render(<RecruitCard post={noRequirementsPost} onPress={jest.fn()} onJoin={jest.fn()} />);
    
    expect(screen.queryByText('Requirements')).toBeFalsy();
  });

  it('should handle compact mode', () => {
    render(<RecruitCard post={mockRecruitPost} onPress={jest.fn()} onJoin={jest.fn()} compact />);
    
    // In compact mode, should still show essential info
    expect(screen.getByText('Test Clan')).toBeTruthy();
    expect(screen.getByText('#ABC123')).toBeTruthy();
  });
});