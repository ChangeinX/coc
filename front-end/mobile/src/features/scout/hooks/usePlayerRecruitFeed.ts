import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlayerRecruitPosts, createPlayerRecruitPost, PlayerRecruitPost, CreatePlayerRecruitRequest } from '../api/recruitingApi';

interface UsePlayerRecruitFeedOptions {
  searchQuery?: string;
}

interface UsePlayerRecruitFeedResult {
  posts: PlayerRecruitPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
  createPost: (data: CreatePlayerRecruitRequest) => Promise<void>;
  isCreating: boolean;
}

export function usePlayerRecruitFeed(options: UsePlayerRecruitFeedOptions = {}): UsePlayerRecruitFeedResult {
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
    queryKey: ['playerRecruitPosts', searchQuery],
    queryFn: ({ pageParam }) => getPlayerRecruitPosts(pageParam, searchQuery),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const createMutation = useMutation({
    mutationFn: createPlayerRecruitPost,
    onSuccess: () => {
      // Invalidate and refetch the player recruit posts after successful creation
      queryClient.invalidateQueries({ queryKey: ['playerRecruitPosts'] });
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
    createPost: async (data: CreatePlayerRecruitRequest) => {
      await createMutation.mutateAsync(data);
    },
    isCreating: createMutation.isPending,
  };
}