import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkForStaleBuild } from './buildCheck.js';

function setupMeta(content) {
  const meta = document.createElement('meta');
  meta.name = 'build-commit';
  meta.content = content;
  document.head.appendChild(meta);
}

describe('checkForStaleBuild', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reloads when commit mismatches', async () => {
    setupMeta('old');
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const cachesMock = { keys: vi.fn().mockResolvedValue(['a']), delete: vi.fn() };
    vi.stubGlobal('caches', cachesMock);
    const result = checkForStaleBuild('new');
    expect(result).toBe(true);
    expect(reload).toHaveBeenCalled();
  });

  it('does nothing when commit matches', () => {
    setupMeta('same');
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const result = checkForStaleBuild('same');
    expect(result).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
