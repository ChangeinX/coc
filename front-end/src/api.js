export const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchJSON(path, options) {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}