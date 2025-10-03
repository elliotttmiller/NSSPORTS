// Centralized API service for backend calls
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "API Error");
  return json.data;
}
