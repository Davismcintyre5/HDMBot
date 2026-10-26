import api from './axios'

export const listRules = (params) => api.get('/rules', { params })
export const getRule = (id) => api.get(`/rules/${id}`)
export const createRule = (data) => api.post('/rules', data)
export const updateRule = (id, data) => api.patch(`/rules/${id}`, data)
export const deleteRule = (id) => api.delete(`/rules/${id}`)
export const testRule = (id, sample) => api.post(`/rules/${id}/test`, sample)
export const executeRule = (id, payload) => api.post(`/rules/${id}/execute`, payload)