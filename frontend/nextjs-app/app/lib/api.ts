const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchUsers() {
  return request<any[]>('/api/users');
}

export async function createUser(payload: { username: string; email: string; password: string }) {
  return request<any>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPeople() {
  return request<any[]>('/api/people');
}

export async function createPerson(payload: { fullName: string; email: string }) {
  return request<any>('/api/people', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCircles() {
  return request<any[]>('/api/circles');
}

export async function createCircle(payload: { name: string; description: string }) {
  return request<any>('/api/circles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRelationships() {
  return request<any[]>('/api/relationships');
}

export async function fetchPermissions() {
  return request<any[]>('/api/permissions');
}

export async function fetchProjects() {
  return request<any[]>('/api/projects');
}

export async function createProject(payload: { name: string; description: string; status: string }) {
  return request<any>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchTasks() {
  return request<any[]>('/api/tasks');
}

export async function fetchTasksByMilestone(milestoneId: number) {
  return request<any[]>(`/api/tasks?milestoneId=${milestoneId}`);
}

export async function createTask(payload: { title: string; details: string; status: string; projectId?: number; milestoneId?: number }) {
  return request<any>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMilestones() {
  return request<any[]>('/api/milestones');
}

export async function createMilestone(payload: { name: string; description: string; status: string; projectId?: number; dueDate?: string; blockedReason?: string }) {
  return request<any>('/api/milestones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMilestone(id: number, payload: { name: string; description: string; status: string; projectId?: number; dueDate?: string; blockedReason?: string }) {
  return request<any>(`/api/milestones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function bulkUpdateMilestoneStatus(milestoneIds: number[], status: string, blockedReason?: string) {
  return request<any[]>('/api/milestones/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ milestoneIds, status, blockedReason }),
  });
}

export async function deleteMilestone(id: number) {
  return request<void>(`/api/milestones/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchDashboardSummary() {
  return request<any>('/api/dashboard/summary', {
    headers: {
      Authorization: 'Basic ' + btoa('admin:admin123'),
    },
  });
}
