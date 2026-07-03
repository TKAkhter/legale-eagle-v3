import type { JwtPayload } from '@/types/auth.types'

/**
 * jwt.ts — pure JWT utilities (no dependencies except base64 decode)
 *
 * We decode JWTs client-side ONLY to read the payload for display/routing.
 * Security validation always happens server-side — never trust client-decoded JWTs.
 *
 * Next.js migration: these functions work identically in Server Components.
 */

/**
 * Decode a JWT without verifying signature.
 * Returns null if the token is malformed.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Base64url → base64 → JSON
    const payload = parts[1]
    const base64  = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded  = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const decoded = JSON.parse(atob(padded))

    return decoded as JwtPayload
  } catch {
    return null
  }
}

/**
 * Check if a JWT is expired (with 30-second buffer for clock skew).
 */
export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  return Date.now() / 1000 > payload.exp - bufferSeconds
}

/**
 * Extract the accessScope field from a JWT.
 * accessScope is the multi-tenant identifier — must be sent as X-Access-Scope header.
 */
export function extractAccessScope(token: string): string {
  const payload = decodeJwt(token)
  return payload?.accessScope ?? ''
}

/**
 * Extract the userId (sub claim) from a JWT.
 */
export function extractUserId(token: string): string {
  const payload = decodeJwt(token)
  return payload?.sub ?? ''
}

/**
 * Get remaining TTL of a token in seconds. Returns 0 if expired.
 */
export function getTokenTtl(token: string): number {
  const payload = decodeJwt(token)
  if (!payload?.exp) return 0
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
}

/**
 * Store tokens in memory (not localStorage — XSS safe).
 * Refresh token stored in httpOnly cookie is managed by the backend.
 * For this React app we store in memory and re-hydrate from sessionStorage as fallback.
 */
const TOKEN_SESSION_KEY = '__le_token__'

export function persistTokenToSession(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_SESSION_KEY, token)
  } catch {
    // sessionStorage not available (private mode, etc.)
  }
}

export function getPersistedToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_SESSION_KEY)
    if (!token || isTokenExpired(token)) {
      sessionStorage.removeItem(TOKEN_SESSION_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

export function clearPersistedToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_SESSION_KEY)
  } catch {
    // ignore
  }
}
