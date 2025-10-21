export const BACKEND_BASE = "http://127.0.0.1:5000";

// ------------------------------------------------------------------
// Helper function to safely parse JSON and handle HTTP errors
// ------------------------------------------------------------------
async function j(r: Response) {
  let t;
  try {
    t = await r.json();
  } catch {
    t = {};
  }
  if (!r.ok) {
    throw new Error(t?.error || `HTTP ${r.status}`);
  }
  return t;
}

// ------------------------------------------------------------------
// Auth-related API calls
// ------------------------------------------------------------------
export async function getMe() {
  return j(
    await fetch(`${BACKEND_BASE}/api/me`, {
      credentials: "include",
    })
  );
}

export async function login(email: string, password: string) {
  return j(
    await fetch(`${BACKEND_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function getSchoolDetails(schoolName: string) {
  const r = await fetch(`${BACKEND_BASE}/api/schools/${encodeURIComponent(schoolName)}`, {
    credentials: "include",
  });
  const x = await r.json();
  return x;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  address?: string;
}) {
  return j(
    await fetch(`${BACKEND_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
  );
}

export async function logout() {
  await fetch(`${BACKEND_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

// ------------------------------------------------------------------
// Data types
// ------------------------------------------------------------------
export type School = {
  school_name?: string;
  name?: string;
  postal_code?: string;
  mainlevel_code?: string;
  zone_code?: string;
  type_code?: string;
  address?: string;
};

// ------------------------------------------------------------------
// School search with pagination
// ------------------------------------------------------------------
export async function searchSchools(params: {
  q?: string;
  level?: string;
  zone?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const sp = new URLSearchParams();

  if (params.q) sp.set("q", params.q);
  if (params.level) sp.set("level", params.level);
  if (params.zone) sp.set("zone", params.zone);
  if (params.type) sp.set("type", params.type);
  if (params.limit !== undefined) sp.set("limit", params.limit.toString());
  if (params.offset !== undefined) sp.set("offset", params.offset.toString());

  const r = await fetch(`${BACKEND_BASE}/api/schools?` + sp.toString(), {
    credentials: "include",
  });

  const x = await r.json();

  // Return full response so frontend can use total, total_pages, etc.
  return x; // { items, total, limit, offset, total_pages }
}
