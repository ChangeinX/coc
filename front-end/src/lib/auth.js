export function getJwtPayload(token) {
  try {
    const payload = atob(token.split('.')[1]);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function getSub(token) {
  const data = getJwtPayload(token);
  return data && data.sub ? data.sub : '';
}

