import api from './axios'

export const sendBroadcast = (data) => api.post('/broadcast/send', data)
export const previewBroadcast = (data) => api.post('/broadcast/preview', data)
export const getBroadcastHistory = (sessionId) =>
  api.get('/broadcast/history', { params: { sessionId } })