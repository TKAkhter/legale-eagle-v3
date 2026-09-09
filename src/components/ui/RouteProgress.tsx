/**
 * RouteProgress.tsx — NProgress top loading bar on route transitions.
 *
 * Mounts once in main.tsx (outside the Router).
 * Starts on navigation start, completes on render.
 */
import { useEffect } from 'react'
import { useLocation, useNavigation } from 'react-router-dom'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  speed:       300,
  trickleSpeed:200,
  minimum:     0.1,
})

export function RouteProgress() {
  const { state } = useNavigation()
  const location  = useLocation()

  // Start on loading, complete on idle
  useEffect(() => {
    if (state === 'loading') NProgress.start()
    else                     NProgress.done()
  }, [state])

  // Also complete on location change (lazy route resolved)
  useEffect(() => { NProgress.done() }, [location])

  return null
}
