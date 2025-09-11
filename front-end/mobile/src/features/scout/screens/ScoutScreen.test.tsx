import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScoutScreen from './ScoutScreen';
import { useAuthStore } from '@store/auth.store';
import { usePlayerInfo } from '@features/dashboard/hooks/usePlayerInfo';

// Mock dependencies
jest.mock('@store/auth.store');
jest.mock('@features/dashboard/hooks/usePlayerInfo');
jest.mock('../hooks/useRecruitFeed');
jest.mock('../hooks/usePlayerRecruitFeed');
jest.mock('../api/recruitingApi');

// Mock theme
jest.mock('@theme/index', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      surface: '#F2F2F7',
      border: '#C6C6C8',
      text: '#000000',
      textSecondary: '#8E8E93',
      primary: '#007AFF',
    },
    spacing: {
      '2xl': 24,
    },
  }),
}));

// Mock components
jest.mock('@components/FloatingActionButton', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    FloatingActionButton: ({ actions, ...props }: any) => {
      return (
        <ReactNative.View testID="floating-action-button" {...props}>
          {actions.map((action: any) => (
            <ReactNative.TouchableOpacity key={action.id} onPress={action.onPress}>
              <ReactNative.Text>{action.label}</ReactNative.Text>
            </ReactNative.TouchableOpacity>
          ))}
        </ReactNative.View>
      );
    },
  };
});

// Mock other components
jest.mock('../components', () => ({
  RecruitFeed: () => null,
  PlayerRecruitFeed: () => null,
  DiscoveryBar: () => null,
  ClanPostForm: () => null,
  PlayerPostForm: () => null,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUsePlayerInfo = usePlayerInfo as jest.MockedFunction<typeof usePlayerInfo>;

// Mock implementations
const mockRecruitFeed = {
  posts: [],
  isLoading: false,
  isFetchingNextPage: false,
  isRefetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  joinClan: jest.fn(),
};

const mockPlayerFeed = {
  posts: [],
  isLoading: false,
  isFetchingNextPage: false,
  isRefetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  createPost: jest.fn(),
  isCreating: false,
};

jest.mock('../hooks/useRecruitFeed', () => ({
  useRecruitFeed: () => mockRecruitFeed,
}));

jest.mock('../hooks/usePlayerRecruitFeed', () => ({
  usePlayerRecruitFeed: () => mockPlayerFeed,
}));

jest.mock('../api/recruitingApi', () => ({
  createPlayerRecruitPost: jest.fn(),
  createRecruitPost: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderScoutScreen = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ScoutScreen />
    </QueryClientProvider>
  );
};

describe('ScoutScreen FAB Conditional Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not a leader or co-leader', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { player_tag: '#PLAYER123' },
        isAuthenticated: true,
        hasPlayerTag: true,
      } as any);

      mockUsePlayerInfo.mockReturnValue({
        data: {
          tag: '#PLAYER123',
          name: 'TestPlayer',
          clanTag: '#CLAN123',
          role: 'member', // Not a leader or co-leader
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should only show FAB in Need a Clan tab', () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      expect(screen.queryByTestId('floating-action-button')).toBeNull();
      
      // Switch to "Need a Clan" tab
      fireEvent.press(screen.getByText('Need a Clan'));
      
      // Should show FAB now
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
    });

    it('should not show clan post creation option in Find a Clan tab', () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      expect(screen.queryByTestId('floating-action-button')).toBeNull();
    });
  });

  describe('when user is a leader', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { player_tag: '#LEADER123' },
        isAuthenticated: true,
        hasPlayerTag: true,
      } as any);

      mockUsePlayerInfo.mockReturnValue({
        data: {
          tag: '#LEADER123',
          name: 'TestLeader',
          clanTag: '#CLAN123',
          role: 'leader',
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should show FAB in both Find a Clan and Need a Clan tabs', () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
      
      // Switch to "Need a Clan" tab
      fireEvent.press(screen.getByText('Need a Clan'));
      
      // Should still show FAB
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
    });

    it('should show clan post creation option in Find a Clan tab', async () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      const fab = screen.getByTestId('floating-action-button');
      
      // Expand FAB
      fireEvent.press(fab);
      
      await waitFor(() => {
        expect(screen.getByText('Create Clan Post')).toBeTruthy();
      });
    });

    it('should show player post creation option in Need a Clan tab', async () => {
      renderScoutScreen();
      
      // Switch to "Need a Clan" tab
      fireEvent.press(screen.getByText('Need a Clan'));
      
      const fab = screen.getByTestId('floating-action-button');
      
      // Expand FAB
      fireEvent.press(fab);
      
      await waitFor(() => {
        expect(screen.getByText('Create Player Post')).toBeTruthy();
      });
    });
  });

  describe('when user is a co-leader', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { player_tag: '#COLEADER123' },
        isAuthenticated: true,
        hasPlayerTag: true,
      } as any);

      mockUsePlayerInfo.mockReturnValue({
        data: {
          tag: '#COLEADER123',
          name: 'TestCoLeader',
          clanTag: '#CLAN123',
          role: 'coLeader',
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should show FAB in both tabs like a leader', () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
      
      // Switch to "Need a Clan" tab
      fireEvent.press(screen.getByText('Need a Clan'));
      
      // Should still show FAB
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
    });
  });

  describe('when user has no clan', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { player_tag: '#NOCLAN123' },
        isAuthenticated: true,
        hasPlayerTag: true,
      } as any);

      mockUsePlayerInfo.mockReturnValue({
        data: {
          tag: '#NOCLAN123',
          name: 'TestPlayerNoClan',
          clanTag: null,
          role: null,
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should only show FAB in Need a Clan tab', () => {
      renderScoutScreen();
      
      // Should be on "Find a Clan" tab by default
      expect(screen.queryByTestId('floating-action-button')).toBeNull();
      
      // Switch to "Need a Clan" tab
      fireEvent.press(screen.getByText('Need a Clan'));
      
      // Should show FAB now
      expect(screen.getByTestId('floating-action-button')).toBeTruthy();
    });
  });
});