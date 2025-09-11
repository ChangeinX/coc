import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRecruitFeed } from './useRecruitFeed';
import * as recruitingApi from '../api/recruitingApi';

// Mock the recruiting API
jest.mock('../api/recruitingApi');
const mockedGetRecruitPosts = recruitingApi.getRecruitPosts as jest.MockedFunction<typeof recruitingApi.getRecruitPosts>;
const mockedJoinClan = recruitingApi.joinClan as jest.MockedFunction<typeof recruitingApi.joinClan>;

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

describe('useRecruitFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return recruit posts', async () => {
    const mockPosts = [
      {
        id: 1,
        data: {
          clanTag: '#ABC123',
          name: 'Test Clan',
          memberCount: 25,
          callToAction: 'Join us!'
        },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => useRecruitFeed(), {
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
    expect(mockedGetRecruitPosts).toHaveBeenCalledWith(undefined, undefined);
  });

  it('should handle pagination with nextCursor', async () => {
    const firstPagePosts = [
      {
        id: 1,
        data: { clanTag: '#ABC123', name: 'Clan 1', memberCount: 25, callToAction: 'Join!' },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    const secondPagePosts = [
      {
        id: 2,
        data: { clanTag: '#DEF456', name: 'Clan 2', memberCount: 30, callToAction: 'Active!' },
        createdAt: '2024-01-02T00:00:00Z'
      }
    ];

    // First page response
    mockedGetRecruitPosts.mockResolvedValueOnce({
      items: firstPagePosts,
      nextCursor: 'cursor123'
    });

    const { result } = renderHook(() => useRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toEqual(firstPagePosts);
    expect(result.current.hasNextPage).toBe(true);

    // Mock second page response
    mockedGetRecruitPosts.mockResolvedValueOnce({
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
    expect(mockedGetRecruitPosts).toHaveBeenCalledWith('cursor123', undefined);
  });

  it('should handle search queries', async () => {
    const mockPosts = [
      {
        id: 1,
        data: { clanTag: '#ABC123', name: 'War Clan', memberCount: 25, callToAction: 'Join war!' },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => useRecruitFeed({ searchQuery: 'war' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetRecruitPosts).toHaveBeenCalledWith(undefined, 'war');
  });

  it('should handle join clan functionality', async () => {
    const mockPosts = [
      {
        id: 1,
        data: { clanTag: '#ABC123', name: 'Test Clan', memberCount: 25, callToAction: 'Join!' },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    mockedGetRecruitPosts.mockResolvedValueOnce({
      items: mockPosts,
      nextCursor: null
    });

    mockedJoinClan.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test join clan
    await result.current.joinClan(1);

    expect(mockedJoinClan).toHaveBeenCalledWith(1);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Network error');
    mockedGetRecruitPosts.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRecruitFeed(), {
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
        data: { clanTag: '#ABC123', name: 'Initial Clan', memberCount: 25, callToAction: 'Join!' },
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    const refreshedPosts = [
      {
        id: 2,
        data: { clanTag: '#DEF456', name: 'New Clan', memberCount: 30, callToAction: 'Active!' },
        createdAt: '2024-01-02T00:00:00Z'
      }
    ];

    // Initial load
    mockedGetRecruitPosts.mockResolvedValueOnce({
      items: initialPosts,
      nextCursor: null
    });

    const { result } = renderHook(() => useRecruitFeed(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts).toEqual(initialPosts);

    // Mock refresh response
    mockedGetRecruitPosts.mockResolvedValueOnce({
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