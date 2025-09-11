import { apiFetch } from '@services/apiClient';
import { Member } from '@components/MemberCard';

// Types for API responses
export interface ClanData {
  tag: string;
  name: string;
  description?: string;
  type?: string;
  badgeUrls?: {
    small?: string;
    large?: string;
    medium?: string;
  };
  clanLevel: number;
  clanPoints: number;
  requiredTrophies: number;
  warFrequency?: string;
  warWinStreak?: number;
  warWins?: number;
  warLosses?: number;
  warTies?: number;
  members: number;
  memberList: ClanMember[];
  isWarLogPublic?: boolean;
  location?: {
    id: number;
    name: string;
    isCountry: boolean;
    countryCode?: string;
  };
  labels?: Array<{
    id: number;
    name: string;
    iconUrls?: {
      small?: string;
      medium?: string;
    };
  }>;
}

export interface ClanMember {
  tag: string;
  name: string;
  role?: string;
  expLevel?: number;
  league?: {
    id: number;
    name: string;
    iconUrls?: {
      small?: string;
      tiny?: string;
      medium?: string;
    };
  };
  trophies: number;
  clanRank?: number;
  previousClanRank?: number;
  donations: number;
  donationsReceived: number;
  townHallLevel: number;
  versusTrophies?: number;
  versusBattleWinCount?: number;
  deep_link?: string;
}

export interface RiskData {
  player_tag: string;
  risk_score: number;
  last_seen: string | null;
  risk_breakdown: Array<{
    points: number;
    reason: string;
  }>;
}

export interface LoyaltyData {
  [playerTag: string]: number;
}

// API functions
export const dashboardApi = {
  // Get clan data
  getClan: async (clanTag: string): Promise<ClanData> => {
    return apiFetch<ClanData>(`/api/v1/clan-data/clans/${encodeURIComponent(clanTag)}`, {
      auth: true,
    });
  },

  // Get at-risk members
  getAtRiskMembers: async (clanTag: string): Promise<RiskData[]> => {
    return apiFetch<RiskData[]>(
      `/api/v1/clan-data/clans/${encodeURIComponent(clanTag)}/members/at-risk`,
      { auth: true }
    );
  },

  // Get member loyalty data
  getMemberLoyalty: async (clanTag: string): Promise<LoyaltyData> => {
    return apiFetch<LoyaltyData>(
      `/api/v1/clan-data/clans/${encodeURIComponent(clanTag)}/members/loyalty`,
      { auth: true }
    );
  },

  // Get complete clan dashboard data
  getDashboardData: async (clanTag: string) => {
    const [clanData, riskData, loyaltyData] = await Promise.all([
      dashboardApi.getClan(clanTag),
      dashboardApi.getAtRiskMembers(clanTag),
      dashboardApi.getMemberLoyalty(clanTag),
    ]);

    // Merge the data like in the original dashboard
    const riskMap = Object.fromEntries(
      riskData.map((r) => [r.player_tag, r])
    );

    const enrichedMembers: Member[] = clanData.memberList.map((m) => {
      const playerTag = m.tag.replace('#', '');
      const riskInfo = riskMap[playerTag];
      
      return {
        ...m,
        risk_score: riskInfo?.risk_score || 0,
        last_seen: riskInfo?.last_seen || undefined,
        risk_breakdown: riskInfo?.risk_breakdown || [],
        loyalty: loyaltyData[playerTag] || 0,
        // Ensure league information is included
        league: m.league,
        expLevel: m.expLevel,
      };
    });

    const topRisk = [...enrichedMembers]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 5);

    return {
      clan: clanData,
      members: enrichedMembers,
      topRisk,
    };
  },
};