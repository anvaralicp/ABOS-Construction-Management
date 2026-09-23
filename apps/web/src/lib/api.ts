let memoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  memoryToken = token;
}

export function getAccessToken(): string | null {
  return memoryToken;
}

export function clearAccessToken() {
  memoryToken = null;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('abos_org_id') : null;
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }

  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:401'));
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  } else if (contentType?.includes('text/csv') || contentType?.includes('spreadsheetml')) {
    return response.blob();
  }
  
  return response.text();
}
