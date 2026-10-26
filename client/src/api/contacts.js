import api from './axios'

export const listContacts = (params) => api.get('/contacts', { params })
export const getContact = (jid, sessionId) =>
  api.get(`/contacts/${encodeURIComponent(jid)}`, { params: { sessionId } })
export const createContact = (data) => api.post('/contacts', data)
export const updateContact = (jid, sessionId, patch) =>
  api.patch(`/contacts/${encodeURIComponent(jid)}`, patch, { params: { sessionId } })
export const deleteContact = (jid, sessionId) =>
  api.delete(`/contacts/${encodeURIComponent(jid)}`, { params: { sessionId } })
export const syncContact = (sessionId, jid) =>
  api.post('/contacts/sync', { sessionId, jid })