import api from './axios'

export const getHealth = () => api.get('/health')
export const getDetailedHealth = () => api.get('/health/detailed')