import api from './axios'

const BASE = '/sessions'

export const listSessions = () => api.get(BASE)
export const getSession = (sessionId) => api.get(`${BASE}/${sessionId}`)
export const createSession = (sessionId) => api.post(BASE, { sessionId })
export const deleteSession = (sessionId) => api.delete(`${BASE}/${sessionId}`)
export const connectSession = (sessionId) => api.post(`${BASE}/${sessionId}/connect`)
export const disconnectSession = (sessionId, logout = false) =>
  api.post(`${BASE}/${sessionId}/disconnect`, { logout })
export const syncSession = (sessionId) => api.post(`${BASE}/${sessionId}/sync`)
export const getSessionQR = (sessionId) => api.get(`${BASE}/${sessionId}/qr`)
export const exportSessionQR = (sessionId) => api.post(`${BASE}/${sessionId}/export-qr`)