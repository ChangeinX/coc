import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { RecruitFeed } from './RecruitFeed';
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

// Mock the RecruitCard component
jest.mock('./RecruitCard', () => ({
  RecruitCard: ({ post, onPress, onJoin }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID={`recruit-card-${post.id}`} onPress={() => onPress(post)}>
        <Text>{post.data.name}</Text>
        <TouchableOpacity testID={`join-button-${post.id}`} onPress={() => onJoin(post)}>
          <Text>Join</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
}));

const mockPosts: ClanRecruitPost[] = [
  {
    id: 1,
    data: { clanTag: '#CLAN1', name: 'Clan One', memberCount: 25, callToAction: 'Join us!' },
    createdAt: '2024-01-01T12:00:00Z',
  },
  {
    id: 2,
    data: { clanTag: '#CLAN2', name: 'Clan Two', memberCount: 30, callToAction: 'We are active!' },
    createdAt: '2024-01-02T12:00:00Z',
  },
  {
    id: 3,
    data: { clanTag: '#CLAN3', name: 'Clan Three', memberCount: 40, callToAction: 'War clan!' },
    createdAt: '2024-01-03T12:00:00Z',
  },
];

describe('RecruitFeed', () => {
  const defaultProps = {
    posts: mockPosts,
    onPostPress: jest.fn(),
    onJoinPress: jest.fn(),
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

  it('should render list of recruit posts', () => {
    render(<RecruitFeed {...defaultProps} />);
    
    expect(screen.getByText('Clan One')).toBeTruthy();
    expect(screen.getByText('Clan Two')).toBeTruthy();
    expect(screen.getByText('Clan Three')).toBeTruthy();
  });

  it('should call onPostPress when a post is pressed', () => {
    const onPostPress = jest.fn();
    render(<RecruitFeed {...defaultProps} onPostPress={onPostPress} />);
    
    const firstCard = screen.getByTestId('recruit-card-1');
    fireEvent.press(firstCard);
    
    expect(onPostPress).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('should call onJoinPress when join button is pressed', () => {
    const onJoinPress = jest.fn();
    render(<RecruitFeed {...defaultProps} onJoinPress={onJoinPress} />);
    
    const joinButton = screen.getByTestId('join-button-1');
    fireEvent.press(joinButton);
    
    expect(onJoinPress).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('should show loading indicator when loading', () => {
    render(<RecruitFeed {...defaultProps} isLoading={true} posts={[]} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should show empty state when no posts and not loading', () => {
    render(<RecruitFeed {...defaultProps} posts={[]} />);
    
    expect(screen.getByText('No clans found')).toBeTruthy();
    expect(screen.getByText('Try adjusting your search criteria')).toBeTruthy();
  });

  it('should show load more indicator when loading more', () => {
    render(<RecruitFeed {...defaultProps} isLoadingMore={true} hasMore={true} />);
    
    expect(screen.getByTestId('load-more-indicator')).toBeTruthy();
  });

  it('should call onLoadMore when reaching end of list', () => {
    const onLoadMore = jest.fn();
    render(<RecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={true} />);
    
    const flatList = screen.getByTestId('recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('should call onRefresh when pull to refresh is triggered', () => {
    const onRefresh = jest.fn();
    render(<RecruitFeed {...defaultProps} onRefresh={onRefresh} />);
    
    const flatList = screen.getByTestId('recruit-feed-list');
    fireEvent(flatList, 'refresh');
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should not call onLoadMore when hasMore is false', () => {
    const onLoadMore = jest.fn();
    render(<RecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={false} />);
    
    const flatList = screen.getByTestId('recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should not call onLoadMore when already loading more', () => {
    const onLoadMore = jest.fn();
    render(<RecruitFeed {...defaultProps} onLoadMore={onLoadMore} hasMore={true} isLoadingMore={true} />);
    
    const flatList = screen.getByTestId('recruit-feed-list');
    fireEvent(flatList, 'endReached');
    
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('should handle empty posts array gracefully', () => {
    render(<RecruitFeed {...defaultProps} posts={[]} />);
    
    expect(screen.getByText('No clans found')).toBeTruthy();
  });

  it('should show refreshing state correctly', () => {
    render(<RecruitFeed {...defaultProps} isRefreshing={true} />);
    
    const flatList = screen.getByTestId('recruit-feed-list');
    expect(flatList.props.refreshControl.props.refreshing).toBe(true);
  });
});