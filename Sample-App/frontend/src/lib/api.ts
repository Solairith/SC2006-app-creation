export const BACKEND_BASE = "";

// Better error handling function
async function handleResponse(r: Response) {
  let data: any = {};
  try { 
    data = await r.json(); 
  } catch {
    // If response isn't JSON, create a basic error structure
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    return data;
  }
  
  if (!r.ok) {
    const error = new Error(data?.error || `HTTP ${r.status}`);
    (error as any).responseData = data; // Attach full response data
    throw error;
  }
  return data;
}

// --- Auth (local) ---
export async function signup(name: string, email: string, password: string) {
  const r = await fetch(`${BACKEND_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(r);
}

export async function login(email: string, password: string) {
  const r = await fetch(`${BACKEND_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(r);
}

export async function logout() {
  const r = await fetch(`${BACKEND_BASE}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(r);
}

// Google User Auth
export async function googleLogin(token: string) {
  const r = await fetch(`${BACKEND_BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  return handleResponse(r);
}

export async function getMe() {
  const r = await fetch(`${BACKEND_BASE}/api/me`, { credentials: "include" });
  return handleResponse(r);
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
  return handleResponse(r);
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
  postal_code?:string;
  cutoff_primary?:string |null;
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
  return handleResponse(r);
}

export async function getSchoolDetails(name: string) {
  const r = await fetch(`${BACKEND_BASE}/api/schools/details?name=` + encodeURIComponent(name), { credentials: "include" });
  const data = await handleResponse(r);
  return data.item;
}

export const getRecommendations = async (): Promise<{ items: any[], error?: string }> => {
  try {
    const prefsResponse = await fetch('/api/preferences', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!prefsResponse.ok) {
      throw new Error('Failed to fetch user preferences');
    }
    
    const prefsData = await prefsResponse.json();


    // Use home_postal consistently (backend expects this)
    const homePostal = prefsData.home_postal || prefsData.home_address;
    const maxDistance = prefsData.max_distance_km;
    const level = prefsData.level;
    const subjects = prefsData.subjects || [];
    const ccas = prefsData.ccas || [];

    // Build query parameters for GET request (like your working URL)
    const params = new URLSearchParams();
    
    if (homePostal) params.append('home_postal', homePostal);
    if (maxDistance) params.append('travel_km', maxDistance.toString());
    if (level) params.append('level', level);
    if (subjects.length > 0) params.append('subjects', subjects.join(','));
    if (ccas.length > 0) params.append('ccas', ccas.join(','));

    const url = `/api/schools/recommend?${params.toString()}`;
   

    // Use GET request as your backend expects (like your working example)
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    

    if (!response.ok) {
      let errorMessage = 'Failed to get recommendations';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response isn't JSON, use status text
        errorMessage = `${response.status} ${response.statusText}`;
      }
      console.error('Recommendation API error:', errorMessage);
      return { items: [], error: errorMessage };
    }

    const data = await response.json();
    console.log('Recommendation response received:', {
      itemCount: data.items?.length,
      homePostalUsed: data.home_postal_used,
      userCoords: data.user_coords,
      firstItem: data.items?.[0] ? {
        name: data.items[0].school_name,
        distance: data.items[0].distance_km,
        score: data.items[0].score_percent
      } : null
    });

    // Return ALL items without filtering
    return {
      items: data.items || [],
    };
    
  } catch (error: any) {
    console.error('Error in getRecommendations:', error);
    return { 
      items: [], 
      error: error.message || 'Failed to get recommendations' 
    };
  }
};

export async function emailExists(email: string): Promise<boolean> {
  const r = await fetch(`${BACKEND_BASE}/api/auth/email-exists?email=` + encodeURIComponent(email), {
    credentials: "include",
  });
  const data = await handleResponse(r);
  return !!data.exists;
}

export async function requestPasswordResetLite(email: string, name: string, password: string) {
  const r = await fetch(`/api/auth/password/reset-lite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, name, password }),
  });
  return handleResponse(r);
}
