import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

export const api = {
  setDirectoryServer: (data) => axios.post(`${BASE}/p2p/set-directory-server`, data),
  // Auth
  login: (data) => axios.post(`${BASE}/auth/login`, data),
  register: (data) => axios.post(`${BASE}/auth/register`, data),
  // Directory Server Interactions
  directoryRegister: (data) => axios.post(`${BASE}/p2p/directory-register`, data),
  directorySearch: (query) => axios.get(`${BASE}/p2p/directory-search?q=${query}`),

  // P2P Interactions
  outboundRequest: (data) => axios.post(`${BASE}/p2p/outbound-request`, data),
  outboundAccept: (data) => axios.post(`${BASE}/p2p/outbound-accept`, data),
  outboundMessage: (data) => axios.post(`${BASE}/p2p/outbound-message`, data),
  outboundDisconnect: (data) => axios.post(`${BASE}/p2p/outbound-disconnect`, data),

  // Local State Polling
  getState: () => axios.get(`${BASE}/p2p/state`),
  ackMessages: (count) => axios.post(`${BASE}/p2p/ack-messages`, { count }),
};
