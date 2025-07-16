import { describe, it, expect, vi, afterEach } from 'vitest';
import { timeAgo, shortTimeAgo } from './time.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('timeAgo', () => {
  it('formats seconds ago', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:30Z'));
    expect(timeAgo('2024-01-01T00:00:00Z')).toBe('30 seconds ago');
  });

  it('formats minutes ago', () => {
    vi.setSystemTime(new Date('2024-01-01T00:02:00Z'));
    expect(timeAgo('2024-01-01T00:00:00Z')).toBe('2 minutes ago');
  });

  it('formats hours ago', () => {
    vi.setSystemTime(new Date('2024-01-01T03:00:00Z'));
    expect(timeAgo('2024-01-01T00:00:00Z')).toBe('3 hours ago');
  });

  it('formats days ago', () => {
    vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
    expect(timeAgo('2024-01-01T00:00:00Z')).toBe('3 days ago');
  });
});

describe('shortTimeAgo', () => {
  it('formats seconds', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:30Z'));
    expect(shortTimeAgo('2024-01-01T00:00:00Z')).toBe('30s');
  });

  it('formats minutes', () => {
    vi.setSystemTime(new Date('2024-01-01T00:02:00Z'));
    expect(shortTimeAgo('2024-01-01T00:00:00Z')).toBe('2m');
  });

  it('formats hours', () => {
    vi.setSystemTime(new Date('2024-01-01T03:00:00Z'));
    expect(shortTimeAgo('2024-01-01T00:00:00Z')).toBe('3h');
  });

  it('formats days', () => {
    vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
    expect(shortTimeAgo('2024-01-01T00:00:00Z')).toBe('3d');
  });
});
