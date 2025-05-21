const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
const apiBase = process.env.NEXT_PUBLIC_API_BASE || '';

export const apiUrl = (path: string) => `${baseUrl}${apiBase}${path}`;

export const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(apiUrl(path), options);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`API ${res.status}: ${message}`);
  }
  return res.json();
};
