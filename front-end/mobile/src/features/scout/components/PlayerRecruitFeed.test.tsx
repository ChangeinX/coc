import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PlayerRecruitFeed } from './PlayerRecruitFeed';
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
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  }),
  useThemedStyles: () => ({
    container: { backgroundColor: '#FFFFFF' },
    text: { color: '#000000' },
  }),
}));

// Mock LoadingSpinner
jest.mock('@components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View, Text } = require('react-native');
    return (
      <View testID="loading-spinner">
        <Text>Loading Spinner ({size})</Text>
      </View>
    );
  },
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

// Mock the PlayerRecruitCard component
jest.mock('./PlayerRecruitCard', () => ({
  PlayerRecruitCard: ({ post, onPress, onInvite }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID={`player-recruit-card-${post.id}`} onPress={() => onPress(post)}>
        <Text>{post.name}</Text>
        <TouchableOpacity testID={`invite-button-${post.id}`} onPress={() => onInvite(post)}>
          <Text>Invite</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
}));

const mockPosts: PlayerRecruitPost[] = [
  {
    id: 1,
    name: 'Player One',
    tag: '#PLAYER1',
    description: 'Active war player',
    createdAt: '2024-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'Player Two',
    tag: '#PLAYER2',
    description: 'Looking for active clan',
    createdAt: '2024-01-02T12:00:00Z',
  },
  {
    id: 3,
    name: 'Player Three',
    tag: '#PLAYER3',
    description: 'Max TH player',
    createdAt: '2024-01-03T12:00:00Z',
  },
];

describe('PlayerRecruitFeed', () => {
  const defaultProps = {
    posts: mockPosts,
    onPostPress: jest.fn(),
    onInvitePress: jest.fn(),
    onLoadMore: jest.fn(),
    onRefresh: jest.fn(),
    isLoading: false,
    isLoadingMore: false,
    isRefreshing: false,
    hasMore: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render list of player recruit posts', () => {
    render(<PlayerRecruitFeed {...defaultProps} />);
    
    expect(screen.getByText('Player One')).toBeTruthy();
    expect(screen.getByText('Player Two')).toBeTruthy();
    expect(screen.getByText('Player Three')).toBeTruthy();
  });

  it('should call onPostPress when a post is pressed', () => {
    const onPostPress = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onPostPress={onPostPress} />);
    
    const firstCard = screen.getByTestId('player-recruit-card-1');
    fireEvent.press(firstCard);
    
    expect(onPostPress).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('should call onInvitePress when invite button is pressed', () => {
    const onInvitePress = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onInvitePress={onInvitePress} />);
    
    const inviteButton = screen.getByTestId('invite-button-1');
    fireEvent.press(inviteButton);
    
    expect(onInvitePress).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('should show loading indicator when loading', () => {
    render(<PlayerRecruitFeed {...defaultProps} isLoading={true} posts={[]} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should show empty state when no posts and not loading', () => {
    render(<PlayerRecruitFeed {...defaultProps} posts={[]} />);
    
    expect(screen.getByText('No players found')).toBeTruthy();
    expect(screen.getByText('Check back later for new player posts')).toBeTruthy();
  });

  it('should show load more indicator when loading more', () => {
    render(<PlayerRecruitFeed {...defaultProps} isLoadingMore={true} hasMore={true} />);
    
    expect(screen.getByTestId('load-more-indicator')).toBeTruthy();
  });

  it('should call onLoadMore when reaching end of list', () => {
    const onLoadMore = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={true} />);
    
    const flatList = screen.getByTestId('player-recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('should call onRefresh when pull to refresh is triggered', () => {
    const onRefresh = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onRefresh={onRefresh} />);
    
    const flatList = screen.getByTestId('player-recruit-feed-list');
    fireEvent(flatList, 'refresh');
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should not call onLoadMore when hasMore is false', () => {
    const onLoadMore = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={false} />);
    
    const flatList = screen.getByTestId('player-recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should not call onLoadMore when already loading more', () => {
    const onLoadMore = jest.fn();
    render(<PlayerRecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={true} isLoadingMore={true} />);
    
    const flatList = screen.getByTestId('player-recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should handle empty posts array gracefully', () => {
    render(<PlayerRecruitFeed {...defaultProps} posts={[]} />);
    
    expect(screen.getByText('No players found')).toBeTruthy();
  });

  it('should show refreshing state correctly', () => {
    render(<PlayerRecruitFeed {...defaultProps} isRefreshing={true} />);
    
    const flatList = screen.getByTestId('player-recruit-feed-list');
    expect(flatList.props.refreshControl.props.refreshing).toBe(true);
  });
});