import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PlayerRecruitCard } from './PlayerRecruitCard';
import type { PlayerRecruitPost } from '../api/recruitingApi';

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

const mockPlayerPost: PlayerRecruitPost = {
  id: 1,
  name: 'TestPlayer',
  tag: '#PLAYER123',
  avatar: 'https://example.com/avatar.png',
  description: 'Active player looking for war clan. Max TH14, love to donate and help clanmates.',
  league: 'Champion League III',
  language: 'English',
  war: 'always',
  createdAt: '2024-01-01T12:00:00Z',
};

describe('PlayerRecruitCard', () => {
  it('should render player name and tag', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.getByText('TestPlayer')).toBeTruthy();
    expect(screen.getByText('#PLAYER123')).toBeTruthy();
  });

  it('should render player description', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.getByText('Active player looking for war clan. Max TH14, love to donate and help clanmates.')).toBeTruthy();
  });

  it('should render player details when provided', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.getByText('🏆 Champion League III')).toBeTruthy();
    expect(screen.getByText('🌍 English')).toBeTruthy();
    expect(screen.getByText('⚔️ always')).toBeTruthy();
  });

  it('should render time ago for created date', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    // Should contain some time text (exact format may vary)
    expect(screen.getByText(/ago|hours|days|minutes/)).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const onPress = jest.fn();
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={onPress} onInvite={jest.fn()} />);
    
    const card = screen.getByTestId('player-recruit-card');
    fireEvent.press(card);
    
    expect(onPress).toHaveBeenCalledWith(mockPlayerPost);
  });

  it('should call onInvite when invite button is pressed', () => {
    const onInvite = jest.fn();
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={onInvite} />);
    
    const inviteButton = screen.getByText('Invite');
    fireEvent.press(inviteButton);
    
    expect(onInvite).toHaveBeenCalledWith(mockPlayerPost);
  });

  it('should handle missing optional data gracefully', () => {
    const minimalPost: PlayerRecruitPost = {
      id: 2,
      name: 'MinimalPlayer',
      description: 'Simple description',
      createdAt: '2024-01-01T12:00:00Z',
    };

    render(<PlayerRecruitCard post={minimalPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.getByText('MinimalPlayer')).toBeTruthy();
    expect(screen.getByText('Simple description')).toBeTruthy();
    // Should not crash when optional data is missing
  });

  it('should not render player details section when no details available', () => {
    const { league: _league, language: _language, war: _war, ...postWithoutDetails } = mockPlayerPost;
    const noDetailsPost: PlayerRecruitPost = postWithoutDetails;

    render(<PlayerRecruitCard post={noDetailsPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.queryByText('Player Details')).toBeFalsy();
  });

  it('should handle compact mode', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} compact />);
    
    // In compact mode, should still show essential info
    expect(screen.getByText('TestPlayer')).toBeTruthy();
    expect(screen.getByText('#PLAYER123')).toBeTruthy();
  });

  it('should render avatar when provided', () => {
    render(<PlayerRecruitCard post={mockPlayerPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    const avatar = screen.getByTestId('player-avatar');
    expect(avatar).toBeTruthy();
    expect(avatar.props.source.uri).toBe('https://example.com/avatar.png');
  });

  it('should not render avatar when not provided', () => {
    const { avatar: _avatar, ...postWithoutAvatar } = mockPlayerPost;
    const noAvatarPost: PlayerRecruitPost = postWithoutAvatar;
    render(<PlayerRecruitCard post={noAvatarPost} onPress={jest.fn()} onInvite={jest.fn()} />);
    
    expect(screen.queryByTestId('player-avatar')).toBeFalsy();
  });
});