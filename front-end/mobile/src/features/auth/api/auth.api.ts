import { apiFetch } from '@services/apiClient';

export type LoginRequest = { username: string; password: string };
export type LoginResponse = { accessToken: string; refreshToken?: string };

export async function login(req: LoginRequest) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

