import api from './axios'

export const getStats = (sessionId) => api.get('/dashboard/stats', { params: sessionId ? { sessionId } : {} })
export const getRecentMessages = (params) => api.get('/dashboard/recent-messages', { params })
export const getSessionsSummary = () => api.get('/dashboard/sessions-summary')
export const getActivity = (days = 7) => api.get('/dashboard/activity', { params: { days } })