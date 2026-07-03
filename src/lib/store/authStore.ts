import { createStore, useStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, ApiMenuItem, PermissionSet } from '@/types/auth.types'
import { hasPermission } from '@lib/auth/permissions'
import {
  persistTokenToSession,
  clearPersistedToken,
  getPersistedToken,
} from '@lib/auth/jwt'

/**
 * authStore.ts
 *
 * Uses createStore (factory pattern) instead of the module-level create()
 * so it's SSR-safe for Next.js migration — each request gets its own store.
 *
 * For the Vite/React app we export a singleton useAuthStore hook.
 *
 * State persisted to sessionStorage: accessToken only (cleared on tab close).
 * refreshToken: stored server-side in httpOnly cookie (more secure).
 */

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  refreshToken: string | null
  accessScope:  string
  menuItems:    ApiMenuItem[]
  permissions:  PermissionSet
  isLoading:    boolean
}

interface AuthActions {
  setAuth: (payload: {
    user: AuthUser
    accessToken: string
    refreshToken?: string
    accessScope: string
  }) => void
  setMenuItems: (items: ApiMenuItem[], permissions: PermissionSet) => void
  setToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: string) => boolean
}

type AuthStore = AuthState & AuthActions

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user:         null,
  accessToken:  getPersistedToken(), // re-hydrate from sessionStorage on load
  refreshToken: null,
  accessScope:  '',
  menuItems:    [],
  permissions:  new Set(),
  isLoading:    false,
}

// ─── Store factory (SSR-safe) ─────────────────────────────────────────────────

export const authStoreFactory = () =>
  createStore<AuthStore>()(
    persist(
      (set, get) => ({
        ...initialState,

        setAuth: ({ user, accessToken, refreshToken, accessScope }) => {
          persistTokenToSession(accessToken)
          set({
            user,
            accessToken,
            refreshToken: refreshToken ?? null,
            accessScope,
          })
        },

        setMenuItems: (items, permissions) => {
          set({ menuItems: items, permissions })
        },

        setToken: (token) => {
          persistTokenToSession(token)
          set({ accessToken: token })
        },

        clearAuth: () => {
          clearPersistedToken()
          set({
            user:         null,
            accessToken:  null,
            refreshToken: null,
            accessScope:  '',
            menuItems:    [],
            permissions:  new Set(),
          })
        },

        setLoading: (isLoading) => set({ isLoading }),

        hasPermission: (permission) => {
          const { permissions } = get()
          return hasPermission(permissions, permission)
        },
      }),
      {
        name:    'le-auth',
        storage: createJSONStorage(() => sessionStorage),
        // Only persist non-sensitive state
        partialize: (state) => ({
          accessScope: state.accessScope,
          user: state.user
            ? {
                id:              state.user.id,
                firstName:       state.user.firstName,
                lastName:        state.user.lastName,
                email:           state.user.email,
                companyUserType: state.user.companyUserType,
                profilePic:      state.user.profilePic,
              }
            : null,
        }),
      },
    ),
  )

// ─── Singleton for React/Vite app ─────────────────────────────────────────────

import { create } from 'zustand'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: ({ user, accessToken, refreshToken, accessScope }) => {
        persistTokenToSession(accessToken)
        set({ user, accessToken, refreshToken: refreshToken ?? null, accessScope })
      },

      setMenuItems: (items, permissions) => set({ menuItems: items, permissions }),

      setToken: (token) => {
        persistTokenToSession(token)
        set({ accessToken: token })
      },

      clearAuth: () => {
        clearPersistedToken()
        set({
          user: null, accessToken: null, refreshToken: null,
          accessScope: '', menuItems: [], permissions: new Set(),
        })
      },

      setLoading: (isLoading) => set({ isLoading }),

      hasPermission: (permission) => hasPermission(get().permissions, permission),
    }),
    {
      name: 'le-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessScope: state.accessScope,
        user: state.user
          ? {
              id:              state.user.id,
              firstName:       state.user.firstName,
              lastName:        state.user.lastName,
              email:           state.user.email,
              companyUserType: state.user.companyUserType,
              profilePic:      state.user.profilePic,
            }
          : null,
      }),
    },
  ),
)

// ─── Selectors (memoised for performance) ─────────────────────────────────────

export const selectUser        = (s: AuthStore) => s.user
export const selectToken       = (s: AuthStore) => s.accessToken
export const selectAccessScope = (s: AuthStore) => s.accessScope
export const selectPermissions = (s: AuthStore) => s.permissions
export const selectMenuItems   = (s: AuthStore) => s.menuItems
export const selectIsLoading   = (s: AuthStore) => s.isLoading
export const selectIsAuth      = (s: AuthStore) => !!s.accessToken && !!s.user
