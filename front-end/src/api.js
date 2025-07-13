// Base URL for the backend API. When running the React dev server the
// environment variable `VITE_API_URL` can be used to override this value.
// It defaults to the Flask development server location so that API calls
// from the front-end during local development reach the backend correctly.
// In production the API runs on the same host as the front-end so we use a
// relative path. During local development set `VITE_API_URL` to the backend
// URL (for example `http://localhost:8080`).
export const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchJSON(path, options) {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
