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


// In lib/api.ts - update savePreferences function
export const savePreferences = async (preferences: {
  level?: string;
  subjects?: string[];
  ccas?: string[];
  max_distance_km?: number;
  home_address?: string;
}) => {
  try {
    console.log('Saving preferences:', preferences);
    
    const response = await fetch('/api/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
      credentials: 'include',
    });
    
    console.log('Response status:', response.status);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save preferences');
    }
    
    return data;
  } catch (error) {
    console.error('Error in savePreferences:', error);
    throw error;
  }
};

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


export const getRecommendations = async (): Promise<{ items: any[], error?: string }> => {
  try {

    const prefsResponse = await fetch('/api/preferences', {
      method: 'GET',
      credentials: 'include',
    });
    
    let homeAddress = '';
    if (prefsResponse.ok) {
      const prefsData = await prefsResponse.json();
      homeAddress = prefsData.home_address || '';
    }

    // Call recommendations with home address
    const url = homeAddress 
      ? `/api/schools/recommend?home_address=${encodeURIComponent(homeAddress)}`
      : '/api/schools/recommend';
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { items: [], error: error.error || 'Failed to get recommendations' };
    }
    
    const data = await response.json();
    return { items: data.items || [] };
  } catch (error: any) {
    return { items: [], error: error.message || 'Failed to get recommendations' };
  }
};