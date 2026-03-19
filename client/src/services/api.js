/**
 * CLIENT API SERVICE
 * Thin wrapper over the backend REST API
 */
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const api = {
  // Auth
  register: (data) => axios.post(`${BASE}/auth/register`, data),
  login: (data) => axios.post(`${BASE}/auth/login`, data),

  // Messages
  sendMessage: (msg, token) => axios.post(`${BASE}/message/send`, msg, authHeaders(token)),
  fetchMessages: (userId, token) => axios.get(`${BASE}/message/fetch`, { ...authHeaders(token), params: { userId } }),

  // Files
  uploadFile: (payload, token) => axios.post(`${BASE}/file/upload`, payload, {
    ...authHeaders(token),
    maxBodyLength: Infinity,
  }),
  downloadFile: (fileId, token) => axios.get(`${BASE}/file/download/${fileId}`, authHeaders(token)),
  requestFileKey: (fileId, userId, token) => axios.post(`${BASE}/file/request-key`, { fileId, userId }, authHeaders(token)),

  // Logs
  appendLog: (logEntry, token) => axios.post(`${BASE}/log/append`, { logEntry }, authHeaders(token)),
  syncLogs: (userId, token) => axios.get(`${BASE}/log/sync`, { ...authHeaders(token), params: { userId } }),
};
