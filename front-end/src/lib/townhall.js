const CUSTOM_NAMES = {
  '17': 'Town_Hall17-5.webp',
};

export function getTownHallIcon(level) {
  const sanitized = String(level).replace('.', '-');
  const name = CUSTOM_NAMES[sanitized] ?? `Town_Hall${sanitized}.webp`;
  return new URL(`../assets/${name}`, import.meta.url).href;
}
