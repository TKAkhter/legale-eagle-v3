/**
 * middleware/index.ts
 *
 * React Router-based middleware chain.
 * In Next.js: replace with middleware.ts at the project root using NextResponse.
 *
 * RACE CONDITION FIX:
 *   protectedLoader runs synchronously on every route navigation, including
 *   hard page refreshes. On refresh, the auth token is re-hydrated from
 *   sessionStorage (synchronous) but the permissions Set is empty until
 *   AuthProvider fetches /api/user/get/access/menu (async, after React mounts).
 *
 *   Without this fix: hard refresh on /leads -> rbacMiddleware sees empty
 *   permissions -> redirects to /403 before AuthProvider can load.
 *
 *   Fix: rbacMiddleware skips the check when permissions are empty AND a
 *   valid token exists. The page renders, AuthProvider loads permissions,
 *   and the <Can> / usePermission hooks gate UI elements within the page.
 *   The backend still enforces real authorization on every API call.
 */

import { redirect } from 'react-router-dom'
import { useAuthStore } from '@lib/store/authStore'
import { isTokenExpired } from '@lib/auth/jwt'
import { env } from '@config/featureFlags'
import { hasPermission } from '@lib/auth/permissions'

type MiddlewareFn = () => Response | null

export function authMiddleware(): Response | null {
  const { accessToken, user } = useAuthStore.getState()
  if (!accessToken || !user || isTokenExpired(accessToken)) {
    return redirect('/login') as unknown as Response
  }
  return null
}

export function ssoMiddleware(): Response | null {
  if (env.VITE_FORCE_MICROSOFT_SSO) {
    const { accessToken } = useAuthStore.getState()
    if (!accessToken) {
      return redirect('/login?sso=1') as unknown as Response
    }
  }
  return null
}

export function rbacMiddleware(permission: string): Response | null {
  const { permissions, accessToken } = useAuthStore.getState()

  // If permissions haven't loaded yet (empty Set) but we have a valid token,
  // allow through. AuthProvider will load real permissions after mount, and
  // the <Can> component / usePermission hook will gate UI elements within
  // the page. The backend enforces real auth on every API call regardless.
  if (permissions.size === 0 && accessToken) {
    return null
  }

  if (!hasPermission(permissions, permission)) {
    return redirect('/403') as unknown as Response
  }
  return null
}

export function runMiddleware(fns: MiddlewareFn[]): Response | null {
  for (const fn of fns) {
    const result = fn()
    if (result) return result
  }
  return null
}

export function protectedLoader(permission?: string) {
  return () => {
    const chain: MiddlewareFn[] = [authMiddleware]
    if (env.VITE_FORCE_MICROSOFT_SSO) chain.push(ssoMiddleware)
    if (permission) chain.push(() => rbacMiddleware(permission))
    return runMiddleware(chain)
  }
}
