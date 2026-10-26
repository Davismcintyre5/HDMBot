import api from './axios'

export const login = ({ email, password }) =>
  api.post('/auth/login', { email, password })

export const logout = () => api.post('/auth/logout')

export const getMe = () => api.get('/auth/me')

export const changePassword = ({ currentPassword, newPassword }) =>
  api.post('/auth/change-password', { currentPassword, newPassword })