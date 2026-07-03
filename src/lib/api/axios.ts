import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios'
import { env } from '@config/featureFlags'

/**
 * axios.ts — base HTTP client
 *
 * Two instances:
 *   axiosClient  — standard JSON requests (used everywhere)
 *   axiosBlob    — binary responses for Excel/PDF exports
 *
 * Key behaviours:
 *   1. Attaches Bearer token from authStore on every request
 *   2. Attaches X-Access-Scope header (multi-tenant) from authStore
 *   3. On 401: attempts silent token refresh, then retries original request
 *   4. On second 401 (refresh failed): clears auth store, redirects to /login
 *
 * IMPORTANT — backend API quirk:
 *   Many endpoints mix query params + request body in POST requests.
 *   The custom mutator (buildQueryParams util) handles serialisation.
 *   axiosClient never transforms params automatically — always explicit.
 *
 * Next.js migration note:
 *   Replace getToken/getAccessScope with server-side cookie reads in
 *   lib/api/serverAxios.ts — client instance stays identical.
 */

// Lazily import stores to avoid circular dependencies at module load time
let _getToken: (() => string | null) | null = null
let _getAccessScope: (() => string) | null = null
let _clearAuth: (() => void) | null = null
let _setToken: ((token: string) => void) | null = null

export function bootstrapAxiosAuth(opts: {
  getToken: () => string | null
  getAccessScope: () => string
  clearAuth: () => void
  setToken: (token: string) => void
}) {
  _getToken = opts.getToken
  _getAccessScope = opts.getAccessScope
  _clearAuth = opts.clearAuth
  _setToken = opts.setToken
}

// ─── Create base instance ─────────────────────────────────────────────────────

function createInstance(config: AxiosRequestConfig = {}): AxiosInstance {
  return axios.create({
    baseURL: env.VITE_API_BASE_URL,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...config,
  })
}

export const axiosClient = createInstance()
export const axiosBlob   = createInstance({ responseType: 'blob', timeout: 120_000 })

// ─── Request interceptor — attach token + accessScope ────────────────────────

function attachAuthHeaders(instance: AxiosInstance) {
  instance.interceptors.request.use(
    (config) => {
      const token       = _getToken?.()
      const accessScope = _getAccessScope?.()

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      if (accessScope) {
        config.headers['X-Access-Scope'] = accessScope
      }
      return config
    },
    (error) => Promise.reject(error),
  )
}

attachAuthHeaders(axiosClient)
attachAuthHeaders(axiosBlob)

// ─── Response interceptor — silent token refresh on 401 ──────────────────────

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
  refreshQueue.forEach((resolve) => resolve(token))
  refreshQueue = []
}

async function attemptRefresh(): Promise<string> {
  // Import dynamically to avoid circular dep at module load
  const { useAuthStore } = await import('@lib/store/authStore')
  const store = useAuthStore.getState()

  const refreshToken = store.refreshToken
  const userId       = store.user?.id
  const accessScope  = store.accessScope

  if (!refreshToken || !userId) throw new Error('No refresh token')

  const response = await axios.post(`${env.VITE_API_BASE_URL}/api/auth/refresh/token`, {
    token: store.accessToken,
    refreshToken,
    userId,
    accessScope,
  })

  // Backend returns { token, refreshToken } or { accessToken, ... }
  const newToken = response.data?.token ?? response.data?.accessToken
  if (!newToken) throw new Error('Refresh response missing token')

  _setToken?.(newToken)
  return newToken
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            }
            resolve(axiosClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await attemptRefresh()
        processQueue(newToken)
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        }
        return axiosClient(originalRequest)
      } catch {
        refreshQueue = []
        _clearAuth?.()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ─── Blob download interceptor ────────────────────────────────────────────────

axiosBlob.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Blob errors — parse the error body if it's JSON wrapped in a blob
    if (error.response?.data instanceof Blob) {
      try {
        const text = await (error.response.data as Blob).text()
        const json = JSON.parse(text)
        error.message = json.message ?? error.message
      } catch {
        // ignore parse failure
      }
    }
    return Promise.reject(error)
  },
)
