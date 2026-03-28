import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
  headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export const fetchPrice = () => api.get('/api/gold/price').then((r) => r.data)
export const fetchForecast = (lang = 'en') => api.get('/api/gold/forecast', { params: { lang } }).then((r) => r.data)
export const fetchTechnical = () => api.get('/api/gold/technical').then((r) => r.data)
export const fetchInstitutional = (lang = 'en') => api.get('/api/gold/institutional', { params: { lang } }).then((r) => r.data)
export const fetchTracker = () => api.get('/api/gold/tracker').then((r) => r.data)
export const clearTracker = () => api.delete('/api/gold/tracker').then((r) => r.data)
