import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosError,
} from 'axios'
import { env } from '@config/featureFlags'

/**
 * axios.ts — base HTTP client
 *
 * Two instances:
 *   axiosClient  — standard JSON requests
 *   axiosBlob    — binary responses for Excel/PDF exports
 *
 * Circular-dependency fix:
 *   Previously this file used a dynamic `await import('@lib/store/authStore')`
 *   inside attemptRefresh() to avoid circular deps. This caused Vite to emit
 *   an "ineffective dynamic import" warning because authStore is also
 *   statically imported by many other modules already in the main chunk.
 *
 *   Fix: all auth state access goes through the four callback functions
 *   registered by bootstrapAxiosAuth() at startup. No store import needed here.
 */

// ─── Auth callbacks (registered by AuthProvider on mount) ────────────────────
let _getToken:       () => string | null  = () => null
let _getRefreshToken:() => string | null  = () => null
let _getUserId:      () => string | null  = () => null
let _getAccessScope: () => string         = () => ''
let _clearAuth:      () => void           = () => undefined
let _setToken:       (t: string) => void  = () => undefined

export function bootstrapAxiosAuth(opts: {
  getToken:        () => string | null
  getRefreshToken: () => string | null
  getUserId:       () => string | null
  getAccessScope:  () => string
  clearAuth:       () => void
  setToken:        (token: string) => void
}) {
  _getToken        = opts.getToken
  _getRefreshToken = opts.getRefreshToken
  _getUserId       = opts.getUserId
  _getAccessScope  = opts.getAccessScope
  _clearAuth       = opts.clearAuth
  _setToken        = opts.setToken
}

// ─── Create instances ─────────────────────────────────────────────────────────
function createInstance(config: AxiosRequestConfig = {}): AxiosInstance {
  return axios.create({
    baseURL: env.VITE_API_BASE_URL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...config,
  })
}

export const axiosClient = createInstance()
export const axiosBlob   = createInstance({ responseType: 'blob', timeout: 120_000 })

// ─── Request interceptor ──────────────────────────────────────────────────────
function attachAuthHeaders(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config) => {
      const token       = _getToken()
      const accessScope = _getAccessScope()
      if (token)       config.headers['Authorization']  = `Bearer ${token}`
      if (accessScope) config.headers['X-Access-Scope'] = accessScope
      return config
    },
    (error) => Promise.reject(error),
  )
}
attachAuthHeaders(axiosClient)
attachAuthHeaders(axiosBlob)

// ─── Token refresh (no dynamic import) ───────────────────────────────────────
let isRefreshing  = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
  refreshQueue.forEach(resolve => resolve(token))
  refreshQueue = []
}

async function attemptRefresh(): Promise<string> {
  const refreshToken = _getRefreshToken()
  const userId       = _getUserId()
  const accessScope  = _getAccessScope()
  const currentToken = _getToken()

  if (!refreshToken || !userId) throw new Error('No refresh credentials')

  const response = await axios.post(
    `${env.VITE_API_BASE_URL}/api/auth/refresh/token`,
    { token: currentToken, refreshToken, userId, accessScope },
  )

  const newToken = response.data?.token ?? response.data?.accessToken
  if (!newToken) throw new Error('Refresh response missing token')

  _setToken(newToken)
  return newToken
}

// ─── Response interceptor ─────────────────────────────────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` }
            resolve(axiosClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await attemptRefresh()
        processQueue(newToken)
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` }
        return axiosClient(originalRequest)
      } catch {
        refreshQueue = []
        _clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ─── Blob error handler ───────────────────────────────────────────────────────
axiosBlob.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response?.data instanceof Blob) {
      try {
        const text = await (error.response.data as Blob).text()
        const json = JSON.parse(text)
        error.message = json.message ?? error.message
      } catch { /* ignore parse failure */ }
    }
    return Promise.reject(error)
  },
)
