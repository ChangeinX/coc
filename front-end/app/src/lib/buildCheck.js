export function checkForStaleBuild(jsCommit = import.meta.env.VITE_COMMIT_HASH) {
  const meta = document.querySelector('meta[name="build-commit"]');
  const htmlCommit = meta?.content;
  if (htmlCommit && jsCommit && htmlCommit !== jsCommit) {
    console.warn('Build mismatch detected. Clearing caches and reloading...');
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    localStorage.clear();
    window.location.reload();
    return true;
  }
  return false;
}

export function detectBlankPage(rootId = 'root', delay = 5000) {
  setTimeout(() => {
    const root = document.getElementById(rootId);
    if (root && root.childElementCount === 0) {
      console.warn('Blank page detected. Reloading...');
      window.location.reload();
    }
  }, delay);
}
