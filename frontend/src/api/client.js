import axios from 'axios'

export const TOKEN_KEY = 'aci_token'
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: API_URL, timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  },
)

/** Turn any axios/FastAPI error into a short, user-friendly message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!error.response) return 'Cannot reach the server. Check that the backend is running.'
  const d = error.response.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) return d.map((x) => (x.msg || '').replace(/^Value error, /, '')).filter(Boolean).join(' ')
  return fallback
}

export default api
