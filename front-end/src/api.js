// Base URL for the backend API. When running the React dev server the
// environment variable `VITE_API_URL` can be used to override this value.
// It defaults to the Flask development server location so that API calls
// from the front-end during local development reach the backend correctly.
// In production the API runs on the same host as the front-end so we use a
// relative path. During local development set `VITE_API_URL` to the backend
// URL (for example `http://localhost:8080`).
let apiUrl = import.meta.env.VITE_API_URL || '';
// If the provided API URL omits a scheme, assume HTTPS to ensure requests
// are sent to the correct host. This also strips any leading slashes so that
// `fetch` doesn't treat the value as a relative path.
if (apiUrl && !/^https?:\/\//i.test(apiUrl)) {
    apiUrl = apiUrl.replace(/^\/*/, '');
    apiUrl = `https://${apiUrl}`;
}
export const API_URL = apiUrl;

export async function fetchJSON(path, options = {}) {
    const token = localStorage.getItem('token');
    options.headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${path}`, options);
    if (res.status === 401) {
        localStorage.removeItem('token');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
