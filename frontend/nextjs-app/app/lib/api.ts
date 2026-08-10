const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
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
export async function uploadProfilePhoto(file: File) { const body=new FormData();body.append('file',file);return authenticatedRequest<UserProfile>('/api/profile/me/photo',{method:'POST',body}); }
export async function removeProfilePhoto() { return authenticatedRequest<UserProfile>('/api/profile/me/photo',{method:'DELETE'}); }
export async function uploadGalleryPhoto(file: File) { const body=new FormData();body.append('file',file);return authenticatedRequest<UserProfile>('/api/profile/me/photos',{method:'POST',body}); }
export async function removeGalleryPhoto(index: number) { return authenticatedRequest<UserProfile>(`/api/profile/me/photos/${index}`,{method:'DELETE'}); }

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  responseType?: 'blob';
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
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
  if (init?.responseType === 'blob') return response.blob() as Promise<T>;

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

async function authenticatedRequest<T>(path: string, init?: RequestOptions): Promise<T> {
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

export type NetworkPerson = { id: number; firstName?: string; surname?: string; displayName: string; phoneNumber?: string | null; location?: string; accountStatus: 'ACTIVE' | 'INVITED' | 'MANAGED'; profilePhoto?: string | null; identityType?: 'ACCOUNT' | 'MANAGED'; managedCategory?: 'CHILD' | 'MEMORIAL' | 'OTHER' | null; claimStatus?: 'NONE' | 'NOT_CLAIMABLE' | 'GUARDIAN_APPROVAL_REQUIRED'; gender?: string | null };
export type VisibilityScope = 'PUBLIC' | 'FRIENDS' | 'RELATIVES' | 'COLLEAGUES';
export type NetworkRelationship = { id: number; type: string; visibilityScope: VisibilityScope; visibilityCompany?: string | null; contactPhone?: string | null; contactEmail?: string | null; relativeToUserId?: number | null; person: NetworkPerson };
export type NetworkCircleMember = { person: NetworkPerson; admin: boolean; creator: boolean };
export type CirclePostingPermission = 'ALL_MEMBERS' | 'ADMINS_ONLY';
export type NetworkCircle = { id: number; name: string; description: string; members: NetworkCircleMember[]; ownerName: string; ownerPhoto?: string | null; ownedByCurrentUser: boolean; currentUserAdmin: boolean; postingPermission: CirclePostingPermission; currentUserCanPost: boolean };
export type CirclePost = { id:number; circleId:number; parentPostId?:number|null; authorId:number; authorName:string; authorPhoto?:string|null; message:string; attachmentUrl?:string|null; attachmentName?:string|null; attachmentType?:string|null; attachmentSize?:number|null; createdAt:string; currentUserAuthor:boolean };
export type DirectMessage = { id:number; senderId:number; recipientId:number; senderName:string; senderPhoto?:string|null; message:string; attachmentUrl?:string|null; attachmentName?:string|null; attachmentType?:string|null; attachmentSize?:number|null; createdAt:string; currentUserAuthor:boolean };
export type DirectCall = { id:number; callerId:number; recipientId:number; callerName:string; callerPhoto?:string|null; recipientName:string; recipientPhoto?:string|null; callType:'AUDIO'|'VIDEO'; status:'RINGING'|'ACCEPTED'|'REJECTED'|'ENDED'; offerSdp:string; answerSdp?:string|null; createdAt:string; updatedAt:string; currentUserCaller:boolean };
export type BroadcastAudienceType = 'HORIZONTAL' | 'VERTICAL' | 'LOCATION';
export type BroadcastRecipient = { userId:number; displayName:string; relationship:string; location?:string|null; profilePhoto?:string|null };
export type BroadcastAudience = { audienceType:BroadcastAudienceType; anchorUserId?:number|null; locationQuery?:string|null; recipients:BroadcastRecipient[]; excludedCount:number };
export type BroadcastResult = { broadcastId:number; audienceType:BroadcastAudienceType; deliveredCount:number; failedCount:number; failures:string[]; createdAt:string };

export async function searchNetworkPeople(query: string) {
  return authenticatedRequest<NetworkPerson[]>(`/api/network/search?q=${encodeURIComponent(query)}`);
}
export async function rankNetworkPeople(query:string,candidates:NetworkPerson[]){
  if(!query.trim()||candidates.length<2)return candidates;
  try{
    const ranked=await authenticatedRequest<{id:number|string;score:number}[]>('/api/ai/search/rank',{method:'POST',body:JSON.stringify({query:query.trim(),candidates:candidates.map(person=>({id:person.id,name:person.displayName,location:person.location||''}))})});
    const scores=new Map(ranked.map(item=>[Number(item.id),item.score]));
    return [...candidates].sort((a,b)=>(scores.get(b.id)||0)-(scores.get(a.id)||0));
  }catch{return candidates;}
}

export async function fetchMyRelationships() {
  return authenticatedRequest<NetworkRelationship[]>('/api/network/relationships');
}

export async function previewRelationshipBroadcast(audienceType:BroadcastAudienceType,anchorUserId?:number,location?:string){
  const params=new URLSearchParams({type:audienceType});
  if(anchorUserId)params.set('anchorUserId',String(anchorUserId));
  if(location?.trim())params.set('location',location.trim());
  return authenticatedRequest<BroadcastAudience>(`/api/network/broadcasts/preview?${params}`);
}
function uploadRelationshipBroadcast(body:FormData,onProgress?:(percentage:number)=>void){return new Promise<BroadcastResult>((resolve,reject)=>{const session=getStoredAuthSession();const xhr=new XMLHttpRequest();xhr.open('POST',`${API_BASE_URL}/api/network/broadcasts`);if(session?.accessToken)xhr.setRequestHeader('Authorization',`${session.tokenType||'Bearer'} ${session.accessToken}`);xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(Math.min(99,Math.round(event.loaded/event.total*100)));};xhr.onerror=()=>reject(new ApiError(0,'Broadcast could not reach the server. Check your connection and try again.'));xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){onProgress?.(100);try{resolve(JSON.parse(xhr.responseText) as BroadcastResult);}catch{reject(new ApiError(xhr.status,'The server returned an invalid broadcast response.'));}return;}let message=`Broadcast failed (${xhr.status})`;try{const parsed=JSON.parse(xhr.responseText) as {message?:string;error?:string};message=parsed.message||parsed.error||message;}catch{if(xhr.responseText)message=xhr.responseText;}reject(new ApiError(xhr.status,message));};xhr.send(body);});}
export async function sendRelationshipBroadcast(audienceType:BroadcastAudienceType,message:string,anchorUserId?:number,location?:string,file?:File,onProgress?:(percentage:number)=>void){const body=new FormData();body.append('type',audienceType);body.append('message',message.trim());if(anchorUserId)body.append('anchorUserId',String(anchorUserId));if(location?.trim())body.append('location',location.trim());if(file)body.append('file',file);try{return await uploadRelationshipBroadcast(body,onProgress);}catch(error){if(!isUnauthorizedError(error))throw error;await refreshSessionOrThrow();return uploadRelationshipBroadcast(body,onProgress);}}

export async function fetchRelationshipTypes() {
  return authenticatedRequest<string[]>('/api/network/relationship-types');
}

export async function addMyRelationship(relatedUserId: number, type: string, visibilityScope: VisibilityScope, visibilityCompany?: string) {
  return authenticatedRequest<NetworkRelationship>('/api/network/relationships', {
    method: 'POST', body: JSON.stringify({ relatedUserId, type, visibilityScope, visibilityCompany }),
  });
}

export async function addPersonToMyNetwork(payload: { fullName: string; phoneNumber?: string; email?: string; type: string; visibilityScope: VisibilityScope; visibilityCompany?: string; identityType?: 'ACCOUNT' | 'MANAGED'; managedCategory?: 'CHILD' | 'MEMORIAL' | 'OTHER'; dateOfBirth?: string; dateOfDeath?: string; notes?: string; relativeToUserId?: number }) {
  return authenticatedRequest<NetworkRelationship>('/api/network/relationships/add-person', {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export async function removeMyRelationship(id: number) {
  return authenticatedRequest<void>(`/api/network/relationships/${id}`, { method: 'DELETE' });
}

export async function updateMyRelationship(id: number, payload: { contactName: string; contactPhone?: string; contactEmail?: string; type: string; visibilityScope: VisibilityScope; visibilityCompany?: string }) {
  return authenticatedRequest<NetworkRelationship>(`/api/network/relationships/${id}`, {
    method: 'PUT', body: JSON.stringify(payload),
  });
}

export async function fetchMyCircles() {
  return authenticatedRequest<NetworkCircle[]>('/api/network/circles');
}

export async function createMyCircle(name: string, description: string) {
  return authenticatedRequest<NetworkCircle>('/api/network/circles', {
    method: 'POST', body: JSON.stringify({ name, description }),
  });
}

export async function updateMyCircle(circleId: number, name: string, description: string, postingPermission: CirclePostingPermission) {
  return authenticatedRequest<NetworkCircle>(`/api/network/circles/${circleId}`, {
    method: 'PUT', body: JSON.stringify({ name, description, postingPermission }),
  });
}

export async function fetchCirclePosts(circleId:number){return authenticatedRequest<CirclePost[]>(`/api/network/circles/${circleId}/posts`);}
function uploadCirclePostRequest(circleId:number,body:FormData,onProgress?:(percentage:number)=>void){return new Promise<CirclePost>((resolve,reject)=>{const session=getStoredAuthSession();const xhr=new XMLHttpRequest();xhr.open('POST',`${API_BASE_URL}/api/network/circles/${circleId}/posts`);if(session?.accessToken)xhr.setRequestHeader('Authorization',`${session.tokenType||'Bearer'} ${session.accessToken}`);xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(Math.min(99,Math.round(event.loaded/event.total*100)));};xhr.onerror=()=>reject(new ApiError(0,'Upload could not reach the server. Check your connection and try again.'));xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){onProgress?.(100);try{resolve(JSON.parse(xhr.responseText) as CirclePost);}catch{reject(new ApiError(xhr.status,'The server returned an invalid upload response.'));}return;}let message=`Upload failed (${xhr.status})`;try{const parsed=JSON.parse(xhr.responseText) as {message?:string;error?:string};message=parsed.message||parsed.error||message;}catch{if(xhr.responseText)message=xhr.responseText;}reject(new ApiError(xhr.status,message));};xhr.send(body);});}
export async function createCirclePost(circleId:number,message:string,file?:File,parentPostId?:number,onProgress?:(percentage:number)=>void){const body=new FormData();if(message.trim())body.append('message',message.trim());if(file)body.append('file',file);if(parentPostId)body.append('parentPostId',String(parentPostId));try{return await uploadCirclePostRequest(circleId,body,onProgress);}catch(error){if(!isUnauthorizedError(error))throw error;await refreshSessionOrThrow();return uploadCirclePostRequest(circleId,body,onProgress);}}
export async function fetchCircleAttachment(circleId:number,postId:number){return authenticatedRequest<Blob>(`/api/network/circles/${circleId}/posts/${postId}/attachment`,{responseType:'blob'});}
export async function fetchDirectMessages(otherUserId:number){return authenticatedRequest<DirectMessage[]>(`/api/network/messages/with/${otherUserId}`);}
function uploadDirectMessageRequest(otherUserId:number,body:FormData,onProgress?:(percentage:number)=>void){return new Promise<DirectMessage>((resolve,reject)=>{const session=getStoredAuthSession();const xhr=new XMLHttpRequest();xhr.open('POST',`${API_BASE_URL}/api/network/messages/with/${otherUserId}`);if(session?.accessToken)xhr.setRequestHeader('Authorization',`${session.tokenType||'Bearer'} ${session.accessToken}`);xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(Math.min(99,Math.round(event.loaded/event.total*100)));};xhr.onerror=()=>reject(new ApiError(0,'Upload could not reach the server. Check your connection and try again.'));xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){onProgress?.(100);try{resolve(JSON.parse(xhr.responseText) as DirectMessage);}catch{reject(new ApiError(xhr.status,'The server returned an invalid upload response.'));}return;}let errorMessage=`Message failed (${xhr.status})`;try{const parsed=JSON.parse(xhr.responseText) as {message?:string;error?:string};errorMessage=parsed.message||parsed.error||errorMessage;}catch{if(xhr.responseText)errorMessage=xhr.responseText;}reject(new ApiError(xhr.status,errorMessage));};xhr.send(body);});}
export async function sendDirectMessage(otherUserId:number,message:string,file?:File,onProgress?:(percentage:number)=>void){const body=new FormData();if(message.trim())body.append('message',message.trim());if(file)body.append('file',file);try{return await uploadDirectMessageRequest(otherUserId,body,onProgress);}catch(error){if(!isUnauthorizedError(error))throw error;await refreshSessionOrThrow();return uploadDirectMessageRequest(otherUserId,body,onProgress);}}
export async function fetchDirectMessageAttachment(otherUserId:number,messageId:number){return authenticatedRequest<Blob>(`/api/network/messages/with/${otherUserId}/${messageId}/attachment`,{responseType:'blob'});}
export async function startDirectCall(recipientId:number,callType:'AUDIO'|'VIDEO',offerSdp:string){return authenticatedRequest<DirectCall>('/api/network/calls',{method:'POST',body:JSON.stringify({recipientId,callType,offerSdp})});}
export async function fetchIncomingCalls(){return authenticatedRequest<DirectCall[]>('/api/network/calls/incoming');}
export async function fetchDirectCall(callId:number){return authenticatedRequest<DirectCall>(`/api/network/calls/${callId}`);}
export async function acceptDirectCall(callId:number,answerSdp:string){return authenticatedRequest<DirectCall>(`/api/network/calls/${callId}/accept`,{method:'POST',body:JSON.stringify({answerSdp})});}
export async function rejectDirectCall(callId:number){return authenticatedRequest<DirectCall>(`/api/network/calls/${callId}/reject`,{method:'POST'});}
export async function endDirectCall(callId:number){return authenticatedRequest<DirectCall>(`/api/network/calls/${callId}/end`,{method:'POST'});}

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
