import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const path = window.location.pathname

    if (status === 401 && path !== '/login' && path !== '/qr') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after']
      error.message = retryAfter
        ? `Rate limited. Retry in ${retryAfter}s`
        : 'Rate limited. Slow down.'
    }

    return Promise.reject(error)
  }
)

export default api