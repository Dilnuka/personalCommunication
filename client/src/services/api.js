const API_BASE = '/api';

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  getContacts: () => request('/contacts'),
  searchUsers: (q) => request(`/contacts/search?q=${encodeURIComponent(q)}`),
  addContact: (contactId) => request('/contacts', { method: 'POST', body: JSON.stringify({ contactId }) }),
  removeContact: (contactId) => request(`/contacts/${contactId}`, { method: 'DELETE' }),

  getConversations: () => request('/conversations'),
  createDirectConversation: (userId) =>
    request('/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) }),
  getMessages: (conversationId, before) => {
    const params = before ? `?before=${encodeURIComponent(before)}` : '';
    return request(`/conversations/${conversationId}/messages${params}`);
  },
  markAsRead: (conversationId) =>
    request(`/conversations/${conversationId}/read`, { method: 'POST' }),

  getIceServers: () => request('/webrtc/ice-servers'),

  assistantChat: (messages) =>
    request('/assistant/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
};
