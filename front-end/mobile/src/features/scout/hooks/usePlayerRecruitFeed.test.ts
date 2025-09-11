import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlayerRecruitFeed } from './usePlayerRecruitFeed';
import * as recruitingApi from '../api/recruitingApi';

// Mock the recruiting API
jest.mock('../api/recruitingApi');
const mockedGetPlayerRecruitPosts = recruitingApi.getPlayerRecruitPosts as jest.MockedFunction<typeof recruitingApi.getPlayerRecruitPosts>;
const mockedCreatePlayerRecruitPost = recruitingApi.createPlayerRecruitPost as jest.MockedFunction<typeof recruitingApi.createPlayerRecruitPost>;

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable caching for tests
        staleTime: 0, // Always consider data stale
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePlayerRecruitFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return player recruit posts', async () => {
    const mockPosts = [
      {
        id: 1,
        name: 'Test Player',
        tag: '#PLAYER123',
        description: 'Looking for active clan',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => usePlayerRecruitFeed(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.posts).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.hasNextPage).toBe(false);
    expect(mockedGetPlayerRecruitPosts).toHaveBeenCalledWith(undefined, undefined);
  });

  it('should handle pagination with nextCursor', async () => {
    const firstPagePosts = [
      {
        id: 1,
        name: 'Player 1',
        tag: '#PLAYER1',
        description: 'War enthusiast',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    const secondPagePosts = [
      {
        id: 2,
        name: 'Player 2',
        tag: '#PLAYER2',
        description: 'Active donator',
        createdAt: '2024-01-02T00:00:00Z'
      }
    ];

    // First page response
    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: firstPagePosts,
      nextCursor: 'cursor123'
    });

    const { result } = renderHook(() => usePlayerRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toEqual(firstPagePosts);
    expect(result.current.hasNextPage).toBe(true);

    // Mock second page response
    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: secondPagePosts,
      nextCursor: null
    });

    // Load next page
    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.posts).toEqual([...firstPagePosts, ...secondPagePosts]);
    });
    
    expect(result.current.hasNextPage).toBe(false);
    expect(mockedGetPlayerRecruitPosts).toHaveBeenCalledWith('cursor123', undefined);
  });

  it('should handle search queries', async () => {
    const mockPosts = [
      {
        id: 1,
        name: 'War Player',
        tag: '#WAR123',
        description: 'Love clan wars',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => usePlayerRecruitFeed({ searchQuery: 'war' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetPlayerRecruitPosts).toHaveBeenCalledWith(undefined, 'war');
  });

  it('should handle creating player recruit posts', async () => {
    const mockPosts = [
      {
        id: 1,
        name: 'Test Player',
        description: 'Looking for clan',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    mockedCreatePlayerRecruitPost.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePlayerRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test create post
    const postData = {
      description: 'Active player looking for war clan',
      league: 'Crystal League III',
      language: 'English',
      war: 'always'
    };

    await result.current.createPost(postData);

    expect(mockedCreatePlayerRecruitPost).toHaveBeenCalledWith(postData);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Network error');
    mockedGetPlayerRecruitPosts.mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePlayerRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.posts).toEqual([]);
  });

  it('should refresh data when refetch is called', async () => {
    const initialPosts = [
      {
        id: 1,
        name: 'Initial Player',
        description: 'Initial post',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    const refreshedPosts = [
      {
        id: 2,
        name: 'New Player',
        description: 'New post',
        createdAt: '2024-01-02T00:00:00Z'
      }
    ];

    // Initial load
    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: initialPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => usePlayerRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toEqual(initialPosts);

    // Mock refresh response
    mockedGetPlayerRecruitPosts.mockResolvedValueOnce({
      items: refreshedPosts,
      nextCursor: null
    });

    // Trigger refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.isRefetching).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.posts).toEqual(refreshedPosts);
    });
  });
});