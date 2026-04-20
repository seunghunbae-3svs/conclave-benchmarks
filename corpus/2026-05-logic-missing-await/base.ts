declare function fetchJson<T>(url: string): Promise<T>;

interface Profile {
  id: string;
  email: string;
}

export async function loadProfile(id: string): Promise<Profile | null> {
  const p = await fetchJson<Profile>(`/api/profile/${id}`);
  if (!p) return null;
  return p;
}
