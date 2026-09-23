/**
 * Tracks in-flight axios requests and drives NProgress for every API call.
 */
import NProgress from "nprogress"
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"

NProgress.configure({
  showSpinner: false,
  speed: 300,
  trickleSpeed: 200,
  minimum: 0.08,
})

let pending = 0

function start() {
  pending += 1
  if (pending === 1) NProgress.start()
}

function done() {
  pending = Math.max(0, pending - 1)
  if (pending === 0) NProgress.done()
}

export function attachApiLoading(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Skip blob/long polls if marked
    if (!(config as { skipLoading?: boolean }).skipLoading) start()
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      if (!(response.config as { skipLoading?: boolean }).skipLoading) done()
      return response
    },
    (error) => {
      const cfg = error?.config as { skipLoading?: boolean } | undefined
      if (!cfg?.skipLoading) done()
      return Promise.reject(error)
    },
  )
}
