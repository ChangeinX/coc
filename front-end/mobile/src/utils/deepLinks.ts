/**
 * Deep linking utilities for the mobile app
 */

export const DeepLinks = {
  // Base scheme for the app
  scheme: 'clanboards',

  /**
   * Generate a deep link to view a specific clan
   */
  clan: (clanTag: string) => {
    const cleanTag = clanTag.replace('#', '');
    return `${DeepLinks.scheme}://dashboard/clan/${cleanTag}`;
  },

  /**
   * Generate a deep link to view a specific player/member
   */
  member: (playerTag: string) => {
    const cleanTag = playerTag.replace('#', '');
    return `${DeepLinks.scheme}://dashboard/member/${cleanTag}`;
  },

  /**
   * Generate a deep link to the dashboard
   */
  dashboard: () => {
    return `${DeepLinks.scheme}://dashboard`;
  },

  /**
   * Generate a deep link to messages
   */
  messages: (messageId?: string) => {
    if (messageId) {
      return `${DeepLinks.scheme}://messages/${messageId}`;
    }
    return `${DeepLinks.scheme}://messages`;
  },

  /**
   * Generate a deep link to scout page
   */
  scout: () => {
    return `${DeepLinks.scheme}://scout`;
  },

  /**
   * Generate a deep link to stats page
   */
  stats: () => {
    return `${DeepLinks.scheme}://stats`;
  },

  /**
   * Generate a deep link to settings
   */
  settings: () => {
    return `${DeepLinks.scheme}://settings`;
  },

  /**
   * Parse a deep link URL to extract route information
   */
  parse: (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      return {
        scheme: urlObj.protocol.replace(':', ''),
        path: urlObj.pathname,
        segments: pathSegments,
        params: Object.fromEntries(urlObj.searchParams.entries()),
      };
    } catch (error) {
      console.warn('Failed to parse deep link:', url, error);
      return null;
    }
  },

  /**
   * Check if a URL is a valid app deep link
   */
  isAppLink: (url: string) => {
    return url.startsWith(`${DeepLinks.scheme}://`);
  },
};