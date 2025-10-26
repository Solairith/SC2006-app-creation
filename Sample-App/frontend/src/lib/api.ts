export const BACKEND_BASE = ""; // use Vite proxy to avoid CORS/cookie issues

async function j(r: Response) {
  let t: any = {};
  try { t = await r.json(); } catch {}
  if (!r.ok) throw new Error(t?.error || `HTTP ${r.status}`);
  return t;
}

// --- Auth (local) ---
export async function signup(name: string, email: string, password: string) {
  const r = await fetch(`${BACKEND_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });
  return j(r);
}

export async function login(email: string, password: string) {
  const r = await fetch(`${BACKEND_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return j(r);
}

export async function logout() {
  const r = await fetch(`${BACKEND_BASE}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
  return j(r);
}

export async function getMe() {
  const r = await fetch(`${BACKEND_BASE}/api/me`, { credentials: "include" });
  return j(r);
}

// --- Preferences ---
export type Preferences = {
  level?: "PRIMARY" | "SECONDARY" | string;
  subjects?: string[];
  ccas?: string[];
  max_distance_km?: number;
};

export async function getPreferences(): Promise<any> {
  const r = await fetch(`${BACKEND_BASE}/api/preferences`, { credentials: "include" });
  return j(r);
}

export async function savePreferences(prefs: Preferences) {
  const r = await fetch(`${BACKEND_BASE}/api/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(prefs),
  });
  return j(r);
}

// --- Schools ---
export type School = {
  school_name: string;
  mainlevel_code?: string;
  zone_code?: string;
  type_code?: string;
  address?: string;
};

export async function searchSchools(params: {
  q?: string;
  level?: string;
  zone?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: School[]; total: number; limit: number; offset: number; total_pages: number }> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.level) sp.set("level", params.level);
  if (params.zone) sp.set("zone", params.zone);
  if (params.type) sp.set("type", params.type);
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  const r = await fetch(`${BACKEND_BASE}/api/schools?` + sp.toString(), { credentials: "include" });
  return j(r);
}

export async function getSchoolDetails(name: string) {
  const r = await fetch(`${BACKEND_BASE}/api/schools/details?name=` + encodeURIComponent(name), { credentials: "include" });
  const data = await j(r);
  return data.item;
}


export async function getRecommendations(body?: any) {
  const r = await fetch(`${BACKEND_BASE}/api/schools/recommend`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  return j(r);
}