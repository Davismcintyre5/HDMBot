import api from './axios'

export const listCommands = (params) => api.get('/commands', { params })
export const getCommand = (name) => api.get(`/commands/${name}`)
export const updateCommand = (name, patch) => api.patch(`/commands/${name}`, patch)
export const getCommandUsage = (name) => api.get(`/commands/${name}/usage`)