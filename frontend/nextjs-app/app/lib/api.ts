const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const AUTH_SESSION_KEY = 'circlenet.auth.session';

export type AuthSession = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type StoredAuthSession = AuthSession & {
  receivedAtEpochMs: number;
  expiresAtEpochMs: number;
};

export type SessionTiming = {
  receivedAtEpochMs: number;
  expiresAtEpochMs: number;
  secondsRemaining: number;
  isExpired: boolean;
};

export type SessionProfile = {
  id: number;
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
};

export type UserProfile = Record<string, string | string[] | null> & { phoneNumber: string; photos: string[]; profilePhoto: string | null };

export async function fetchUserProfile() { return authenticatedRequest<UserProfile>('/api/profile/me'); }
export async function saveUserProfile(profile: UserProfile) { return authenticatedRequest<UserProfile>('/api/profile/me', { method: 'PUT', body: JSON.stringify(profile) }); }

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed: ${status}`);
    this.status = status;
  }
}

function getStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.tokenType || !parsed.expiresIn) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    if (typeof parsed.receivedAtEpochMs === 'number' && typeof parsed.expiresAtEpochMs === 'number') {
      return parsed as StoredAuthSession;
    }

    const migratedSession: StoredAuthSession = {
      tokenType: parsed.tokenType,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresIn: parsed.expiresIn,
      receivedAtEpochMs: Date.now(),
      expiresAtEpochMs: Date.now() + (parsed.expiresIn * 1000),
    };
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(migratedSession));
    return migratedSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function setStoredAuthSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }
  const receivedAtEpochMs = Date.now();
  const storedSession: StoredAuthSession = {
    ...session,
    receivedAtEpochMs,
    expiresAtEpochMs: receivedAtEpochMs + (session.expiresIn * 1000),
  };

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(storedSession));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function hasAuthSession() {
  const session = getStoredAuthSession();
  return !!session?.accessToken && !!session.refreshToken;
}

export function getSessionTiming(): SessionTiming | null {
  const session = getStoredAuthSession();
  if (!session) {
    return null;
  }

  const secondsRemaining = Math.max(0, Math.floor((session.expiresAtEpochMs - Date.now()) / 1000));
  return {
    receivedAtEpochMs: session.receivedAtEpochMs,
    expiresAtEpochMs: session.expiresAtEpochMs,
    secondsRemaining,
    isExpired: secondsRemaining <= 0,
  };
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const session = getStoredAuthSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };

  if (!init?.skipAuth && session?.accessToken) {
    headers.Authorization = `${session.tokenType || 'Bearer'} ${session.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Request failed: ${response.status}`;

    if (errorBody) {
      try {
        const parsed = JSON.parse(errorBody) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        message = errorBody;
      }
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as Promise<T>;
}

async function refreshSessionOrThrow() {
  const currentSession = getStoredAuthSession();
  if (!currentSession?.refreshToken) {
    throw new ApiError(401, 'Missing refresh token');
  }

  const refreshedSession = await request<AuthSession>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    skipAuth: true,
  });
  setStoredAuthSession(refreshedSession);
  return refreshedSession;
}

export async function refreshSession() {
  return refreshSessionOrThrow();
}

async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    try {
      await refreshSessionOrThrow();
      return await request<T>(path, init);
    } catch {
      clearAuthSession();
      throw new ApiError(401, 'Session expired');
    }
  }
}

export async function login(identifier: string, password: string) {
  const session = await request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
    skipAuth: true,
  });
  setStoredAuthSession(session);
  return session;
}

export async function fetchAuthHealth() {
  return request<string>('/api/auth/health', {
    method: 'GET',
    skipAuth: true,
  });
}

export async function fetchSessionProfile() {
  return authenticatedRequest<SessionProfile>('/api/auth/me');
}

export async function logout() {
  const session = getStoredAuthSession();
  if (!session?.refreshToken) {
    clearAuthSession();
    return;
  }

  try {
    await request<void>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      skipAuth: true,
    });
  } finally {
    clearAuthSession();
  }
}

export async function revokeSession() {
  const session = getStoredAuthSession();
  if (!session?.refreshToken) {
    clearAuthSession();
    return;
  }

  try {
    await request<void>('/api/auth/revoke', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      skipAuth: true,
    });
  } finally {
    clearAuthSession();
  }
}

export async function fetchUsers() {
  return authenticatedRequest<any[]>('/api/users');
}

export async function createUser(payload: { username: string; email?: string; phoneNumber: string; password: string; firstName?: string; surname?: string; location?: string }) {
  return request<any>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function updateUser(id: number, payload: { username: string; email?: string; phoneNumber: string; password?: string }) {
  return authenticatedRequest<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export type NetworkPerson = { id: number; firstName?: string; surname?: string; displayName: string; phoneNumber: string; location?: string; accountStatus: 'ACTIVE' | 'INVITED' };
export type NetworkRelationship = { id: number; type: string; person: NetworkPerson };
export type NetworkCircleMember = { person: NetworkPerson; admin: boolean; creator: boolean };
export type NetworkCircle = { id: number; name: string; description: string; members: NetworkCircleMember[]; ownerName: string; ownedByCurrentUser: boolean; currentUserAdmin: boolean };

export async function searchNetworkPeople(query: string) {
  return authenticatedRequest<NetworkPerson[]>(`/api/network/search?q=${encodeURIComponent(query)}`);
}

export async function fetchMyRelationships() {
  return authenticatedRequest<NetworkRelationship[]>('/api/network/relationships');
}

export async function fetchRelationshipTypes() {
  return authenticatedRequest<string[]>('/api/network/relationship-types');
}

export async function addMyRelationship(relatedUserId: number, type: string) {
  return authenticatedRequest<NetworkRelationship>('/api/network/relationships', {
    method: 'POST', body: JSON.stringify({ relatedUserId, type }),
  });
}

export async function addPersonToMyNetwork(payload: { fullName: string; phoneNumber: string; email?: string; type: string }) {
  return authenticatedRequest<NetworkRelationship>('/api/network/relationships/add-person', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export async function removeMyRelationship(id: number) {
  return authenticatedRequest<void>(`/api/network/relationships/${id}`, { method: 'DELETE' });
}

export async function fetchMyCircles() {
  return authenticatedRequest<NetworkCircle[]>('/api/network/circles');
}

export async function createMyCircle(name: string, description: string) {
  return authenticatedRequest<NetworkCircle>('/api/network/circles', {
    method: 'POST', body: JSON.stringify({ name, description }),
  });
}

export async function addMemberToMyCircle(circleId: number, userId: number) {
  return authenticatedRequest<NetworkCircle>(`/api/network/circles/${circleId}/members`, {
    method: 'POST', body: JSON.stringify({ userId }),
  });
}

export async function removeMemberFromMyCircle(circleId: number, userId: number) {
  return authenticatedRequest<NetworkCircle>(`/api/network/circles/${circleId}/members/${userId}`, { method: 'DELETE' });
}

export async function promoteCircleAdmin(circleId: number, userId: number) {
  return authenticatedRequest<NetworkCircle>(`/api/network/circles/${circleId}/admins/${userId}`, { method: 'POST' });
}

export async function demoteCircleAdmin(circleId: number, userId: number) {
  return authenticatedRequest<NetworkCircle>(`/api/network/circles/${circleId}/admins/${userId}`, { method: 'DELETE' });
}

export async function fetchPeople() {
  return authenticatedRequest<any[]>('/api/people');
}

export async function createPerson(payload: { fullName: string; email: string; gender?: string }) {
  return authenticatedRequest<any>('/api/people', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePerson(id: number, payload: { fullName: string; email: string; gender?: string }) {
  return authenticatedRequest<any>(`/api/people/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchCircles() {
  return authenticatedRequest<any[]>('/api/circles');
}

export async function createCircle(payload: { name: string; description: string }) {
  return authenticatedRequest<any>('/api/circles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCircle(id: number, payload: { name: string; description: string }) {
  return authenticatedRequest<any>(`/api/circles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchRelationships() {
  return authenticatedRequest<any[]>('/api/relationships');
}

export async function createRelationship(payload: { type: string }) {
  return authenticatedRequest<any>('/api/relationships', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createTaskGroup(payload: { name: string; description: string }) {
  return authenticatedRequest<any>('/api/task-groups', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchTaskGroups() {
  return authenticatedRequest<any[]>('/api/task-groups');
}

export async function updateRelationship(id: number, payload: { type: string }) {
  return authenticatedRequest<any>(`/api/relationships/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchPermissions() {
  return authenticatedRequest<any[]>('/api/permissions');
}

export async function updatePermission(id: number, payload: { name: string; description: string }) {
  return authenticatedRequest<any>(`/api/permissions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchProjects() {
  return authenticatedRequest<any[]>('/api/projects');
}

export async function createProject(payload: { name: string; description: string; status: string }) {
  return authenticatedRequest<any>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProject(id: number, payload: { name: string; description: string; status: string }) {
  return authenticatedRequest<any>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchTasks() {
  return authenticatedRequest<any[]>('/api/tasks');
}

export async function fetchTasksByMilestone(milestoneId: number) {
  return authenticatedRequest<any[]>(`/api/tasks?milestoneId=${milestoneId}`);
}

export async function createTask(payload: { title: string; details: string; status: string; projectId?: number; milestoneId?: number }) {
  return authenticatedRequest<any>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: number, payload: { title: string; details: string; status: string; projectId?: number; milestoneId?: number }) {
  return authenticatedRequest<any>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function fetchMilestones() {
  return authenticatedRequest<any[]>('/api/milestones');
}

export async function createMilestone(payload: { name: string; description: string; status: string; projectId?: number; dueDate?: string; blockedReason?: string }) {
  return authenticatedRequest<any>('/api/milestones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMilestone(id: number, payload: { name: string; description: string; status: string; projectId?: number; dueDate?: string; blockedReason?: string }) {
  return authenticatedRequest<any>(`/api/milestones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function bulkUpdateMilestoneStatus(milestoneIds: number[], status: string, blockedReason?: string) {
  return authenticatedRequest<any[]>('/api/milestones/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ milestoneIds, status, blockedReason }),
  });
}

export async function deleteMilestone(id: number) {
  return authenticatedRequest<void>(`/api/milestones/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchDashboardSummary() {
  return authenticatedRequest<any>('/api/dashboard/summary');
}
