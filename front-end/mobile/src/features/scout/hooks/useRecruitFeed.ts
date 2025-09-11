import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecruitPosts, joinClan, ClanRecruitPost } from '../api/recruitingApi';

interface UseRecruitFeedOptions {
  searchQuery?: string;
}

interface UseRecruitFeedResult {
  posts: ClanRecruitPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
  joinClan: (id: number) => Promise<void>;
  isJoining: boolean;
}

export function useRecruitFeed(options: UseRecruitFeedOptions = {}): UseRecruitFeedResult {
  const { searchQuery } = options;
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['recruitPosts', searchQuery],
    queryFn: ({ pageParam }) => getRecruitPosts(pageParam, searchQuery),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const joinMutation = useMutation({
    mutationFn: joinClan,
    onSuccess: () => {
      // Invalidate and refetch the recruit posts after successful join
      queryClient.invalidateQueries({ queryKey: ['recruitPosts'] });
    },
  });

  // Flatten all pages into a single array of posts
  const posts = data?.pages.flatMap(page => page.items) ?? [];

  return {
    posts,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    hasNextPage: hasNextPage ?? false,
    error: error as Error | null,
    fetchNextPage: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    refetch: () => refetch(),
    joinClan: async (id: number) => {
      await joinMutation.mutateAsync(id);
    },
    isJoining: joinMutation.isPending,
  };
}