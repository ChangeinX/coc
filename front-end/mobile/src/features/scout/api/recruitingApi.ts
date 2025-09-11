import { apiFetch } from '@services/apiClient';

export interface ClanRecruitPost {
  id: number;
  data: {
    clanTag: string;
    deepLink?: string;
    name: string;
    description?: string;
    labels?: Array<{
      id: number;
      name: string;
      iconUrls?: {
        small?: string;
        medium?: string;
      };
    }>;
    warFrequency?: string;
    warLeague?: {
      id: number;
      name: string;
    };
    clanLevel?: number;
    language?: string;
    openSlots?: number;
    memberCount?: number;
    requiredTrophies?: number;
    requiredTownhallLevel?: number;
    requiredBuilderBaseTrophies?: number;
    callToAction?: string;
  };
  createdAt: string;
}

export interface PlayerRecruitPost {
  id: number;
  name: string;
  tag?: string;
  avatar?: string;
  description: string;
  league?: string;
  language?: string;
  war?: string;
  createdAt: string;
}

export interface RecruitResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreatePlayerRecruitRequest {
  description: string;
  league?: string;
  language?: string;
  war?: string;
}

export async function getRecruitPosts(
  pageCursor?: string,
  query?: string
): Promise<RecruitResponse<ClanRecruitPost>> {
  const params = new URLSearchParams();
  
  if (pageCursor) {
    params.set('pageCursor', pageCursor);
  }
  
  if (query) {
    params.set('q', query);
  }
  
  const url = params.toString() 
    ? `/recruiting/recruit?${params.toString()}`
    : '/recruiting/recruit';
    
  return apiFetch(url, {
    method: 'GET',
    auth: false,
  });
}

export async function getPlayerRecruitPosts(
  pageCursor?: string,
  query?: string
): Promise<RecruitResponse<PlayerRecruitPost>> {
  const params = new URLSearchParams();
  
  if (pageCursor) {
    params.set('pageCursor', pageCursor);
  }
  
  if (query) {
    params.set('q', query);
  }
  
  const url = params.toString() 
    ? `/recruiting/player-recruit?${params.toString()}`
    : '/recruiting/player-recruit';
    
  return apiFetch(url, {
    method: 'GET',
    auth: false,
  });
}

export async function createRecruitPost(
  clanTag: string,
  callToAction: string
): Promise<void> {
  return apiFetch('/recruiting/recruit', {
    method: 'POST',
    auth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clanTag,
      callToAction,
    }),
  });
}

export async function createPlayerRecruitPost(
  data: CreatePlayerRecruitRequest
): Promise<void> {
  return apiFetch('/recruiting/player-recruit', {
    method: 'POST',
    auth: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function joinClan(id: number): Promise<void> {
  return apiFetch(`/recruiting/join/${id}`, {
    method: 'POST',
    auth: true,
  });
}