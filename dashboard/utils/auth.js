const TOKEN_KEY = 'sb_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to store token:', e);
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Failed to clear token:', e);
  }
}

export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Use absolute API URL for direct calls, relative for proxy
  const fetchUrl = url.startsWith('/api/') ? `${API_URL}${url}` : url;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(fetchUrl, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    const errorRes = new Response(null, {
      status: 503,
      statusText: 'Service Unavailable',
    });
    errorRes.json = async () => ({ error: 'API server is offline', details: err.message });
    return errorRes;
  }
}

// Check if API server is reachable (tries both direct and proxy)
export async function checkAPIStatus() {
  const check = async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return { online: true, bot: data.bot, servers: data.servers };
      }
    } catch { /* try next */ }
    return null;
  };

  // Try direct API first, then proxy fallback
  const result = await check(`${API_URL}/api/health`) || await check('/api/health');
  return result || { online: false };
}
