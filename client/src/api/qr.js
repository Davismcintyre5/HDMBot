import api from './axios'

export const exportQR = (sessionId) => api.post('/qr/export', { sessionId })
export const getExportedQR = () => api.get('/qr/exported')