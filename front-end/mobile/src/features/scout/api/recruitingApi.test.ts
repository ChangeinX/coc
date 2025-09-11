import { apiFetch } from '@services/apiClient';
import { 
  getRecruitPosts, 
  getPlayerRecruitPosts, 
  createRecruitPost, 
  createPlayerRecruitPost, 
  joinClan 
} from './recruitingApi';

// Mock the apiFetch
jest.mock('@services/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('Recruiting API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecruitPosts', () => {
    it('should fetch clan recruitment posts successfully', async () => {
      const mockResponse = {
        items: [
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
        ],
        nextCursor: null
      };

      mockedApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await getRecruitPosts();

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/recruit', {
        method: 'GET',
        auth: false
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch clan recruitment posts with query parameters', async () => {
      const mockResponse = { items: [], nextCursor: null };
      mockedApiFetch.mockResolvedValueOnce(mockResponse);

      await getRecruitPosts('cursor123', 'search query');

      expect(mockedApiFetch).toHaveBeenCalledWith(
        '/recruiting/recruit?pageCursor=cursor123&q=search+query',
        { method: 'GET', auth: false }
      );
    });
  });

  describe('getPlayerRecruitPosts', () => {
    it('should fetch player recruitment posts successfully', async () => {
      const mockResponse = {
        items: [
          {
            id: 1,
            name: 'Test Player',
            tag: '#PLAYER123',
            description: 'Looking for clan',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        nextCursor: null
      };

      mockedApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await getPlayerRecruitPosts();

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/player-recruit', {
        method: 'GET',
        auth: false
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createRecruitPost', () => {
    it('should create a clan recruitment post successfully', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await createRecruitPost('#CLAN123', 'Join our active clan!');

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/recruit', {
        method: 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clanTag: '#CLAN123',
          callToAction: 'Join our active clan!'
        })
      });
    });
  });

  describe('createPlayerRecruitPost', () => {
    it('should create a player recruitment post successfully', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      const playerData = {
        description: 'Active player looking for war clan',
        league: 'Crystal League III',
        language: 'English',
        war: 'always'
      };

      await createPlayerRecruitPost(playerData);

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/player-recruit', {
        method: 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
    });

    it('should create a player recruitment post with minimal data', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await createPlayerRecruitPost({ description: 'Looking for clan' });

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/player-recruit', {
        method: 'POST',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Looking for clan' })
      });
    });
  });

  describe('joinClan', () => {
    it('should join a clan successfully', async () => {
      mockedApiFetch.mockResolvedValueOnce(undefined);

      await joinClan(123);

      expect(mockedApiFetch).toHaveBeenCalledWith('/recruiting/join/123', {
        method: 'POST',
        auth: true
      });
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const apiError = new Error('Network error');
      mockedApiFetch.mockRejectedValueOnce(apiError);

      await expect(getRecruitPosts()).rejects.toThrow('Network error');
    });
  });
});