export function getTownHallIcon(level) {
  const sanitized = String(level).replace('.', '-');
  return new URL(`../assets/Town_Hall${sanitized}.webp`, import.meta.url).href;
}
