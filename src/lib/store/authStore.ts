/**
 * authStore.ts — single source of truth for authentication state.
 *
 * Persists { accessToken, accessScope, user } to sessionStorage via
 * Zustand's persist middleware. On page refresh, Zustand rehydrates
 * accessToken so protectedLoader can check it without redirecting to login.
 *
 * Usage:
 *   const user        = useAuthStore(s => s.user)
 *   const accessToken = useAuthStore(s => s.accessToken)
 *   useAuthStore.getState().setAuth({ user, accessToken, accessScope })
 *   useAuthStore.getState().clearAuth()
 */
import { create }        from 'zustand'
import { persist }       from 'zustand/middleware'
import type { AuthUser, PermissionSet } from '@/types/auth.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetAuthPayload {
  user:          AuthUser
  accessToken:   string
  refreshToken?: string
  accessScope?:  PermissionSet
}

interface AuthStore {
  // ── State ──
  user:          AuthUser | null
  accessToken:   string | null
  refreshToken:  string | null
  accessScope:   PermissionSet
  menuItems:     unknown[]

  // ── Actions ──
  setAuth:        (payload: SetAuthPayload) => void
  clearAuth:      () => void
  hasPermission:  (path: string) => boolean
}

const EMPTY_SCOPE: PermissionSet = new Set<string>()

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ──
      user:         null,
      accessToken:  null,
      refreshToken: null,
      accessScope:  EMPTY_SCOPE,
      menuItems:    [],

      // ── setAuth — called after successful login ──
      setAuth: ({ user, accessToken, refreshToken, accessScope }) => {
        const scope = accessScope ?? new Set<string>()
        set({
          user,
          accessToken,
          refreshToken:  refreshToken ?? null,
          accessScope:   scope,
          menuItems:     [],
        })
      },

      // ── clearAuth — called on logout or session expiry ──
      clearAuth: () => set({
        user:         null,
        accessToken:  null,
        refreshToken: null,
        accessScope:  EMPTY_SCOPE,
        menuItems:    [],
      }),

      // ── hasPermission — checks if the user can access a route ──
      hasPermission: (path: string) => {
        const { accessScope } = get()
        if (!path) return true
        if (!accessScope || accessScope.size === 0) return true  // no restrictions
        return accessScope.has(path) || accessScope.has('*')
      },
    }),

    {
      name: 'le-auth',
      storage: {
        getItem:    key => { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } },
        setItem:    (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ } },
        removeItem: key => { try { sessionStorage.removeItem(key) } catch { /* ignore */ } },
      },
      // ← accessToken MUST be in partialize — protectedLoader reads it on every navigation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    partialize: (state): any => ({
        accessToken: state.accessToken,
        accessScope: state.accessScope,
        user: state.user ? {
          id:              state.user.id,
          firstName:       state.user.firstName,
          lastName:        state.user.lastName,
          email:           state.user.email,
          companyUserType: state.user.companyUserType,
          profilePic:      state.user.profilePic,
        } : null,
      }),
    }
  )
)
