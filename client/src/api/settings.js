import api from './axios'

export const listSettings = (sessionId) => api.get('/settings', { params: { sessionId } })
export const getDefaults = () => api.get('/settings/defaults')
export const getSetting = (key, sessionId) =>
  api.get(`/settings/${key}`, { params: { sessionId } })
export const setSetting = (key, value, sessionId) =>
  api.put(`/settings/${key}`, { value }, { params: { sessionId } })
export const resetSetting = (key, sessionId) =>
  api.delete(`/settings/${key}`, { params: { sessionId } })