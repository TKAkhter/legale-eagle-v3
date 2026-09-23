import { create } from 'zustand'
import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, ApiMenuItem, PermissionSet } from '@/types/auth.types'
import { hasPermission } from '@lib/auth/permissions'
import {
  persistTokenToSession,
  clearPersistedToken,
} from '@lib/auth/jwt'

/**
 * authStore.ts
 *
 * menuItems are persisted so DynamicSidebarNav survives navigations / reloads.
 * permissions are stored as string[] in sessionStorage and rehydrated as a Set.
 */

interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  refreshToken: string | null
  accessScope:  string
  menuItems:    ApiMenuItem[]
  permissions:  PermissionSet
  menuLoading:  boolean
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
  setMenuLoading: (loading: boolean) => void
  setToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: string) => boolean
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user:         null,
  accessToken:  null,
  refreshToken: null,
  accessScope:  '',
  menuItems:    [],
  permissions:  new Set(),
  menuLoading:  false,
  isLoading:    false,
}

type PersistedSlice = {
  accessToken: string | null
  accessScope: string
  user: AuthUser | null
  menuItems: ApiMenuItem[]
  permissions: string[]
}

function toPersisted(state: AuthStore): PersistedSlice {
  return {
    accessToken: state.accessToken,
    accessScope: state.accessScope,
    user: state.user
      ? {
          id:              state.user.id,
          firstName:       state.user.firstName,
          lastName:        state.user.lastName,
          email:           state.user.email,
          companyUserType: state.user.companyUserType,
          profilePic:      state.user.profilePic,
          accessScope:     state.user.accessScope,
          token:           state.user.token,
          roles:           state.user.roles ?? [],
        }
      : null,
    menuItems: state.menuItems ?? [],
    permissions: [...(state.permissions ?? new Set())],
  }
}

function fromPersisted(persisted: unknown, current: AuthStore): AuthStore {
  const p = (persisted ?? {}) as Partial<PersistedSlice>
  return {
    ...current,
    accessToken: p.accessToken ?? current.accessToken,
    accessScope: p.accessScope ?? current.accessScope,
    user: p.user ?? current.user,
    menuItems: Array.isArray(p.menuItems) ? p.menuItems : current.menuItems,
    permissions: new Set(Array.isArray(p.permissions) ? p.permissions : [...current.permissions]),
  }
}

type SetFn = (
  partial: Partial<AuthStore> | ((s: AuthStore) => Partial<AuthStore>),
) => void
type GetFn = () => AuthStore

const storeBody = (set: SetFn, get: GetFn): AuthStore => ({
  ...initialState,

  setAuth: ({ user, accessToken, refreshToken, accessScope }) => {
    persistTokenToSession(accessToken)
    set({ user, accessToken, refreshToken: refreshToken ?? null, accessScope })
  },

  setMenuItems: (items, permissions) => set({ menuItems: items, permissions, menuLoading: false }),

  setMenuLoading: (menuLoading) => set({ menuLoading }),

  setToken: (token) => {
    persistTokenToSession(token)
    set({ accessToken: token })
  },

  clearAuth: () => {
    clearPersistedToken()
    set({
      user: null, accessToken: null, refreshToken: null,
      accessScope: '', menuItems: [], permissions: new Set(),
      menuLoading: false,
    })
  },

  setLoading: (isLoading) => set({ isLoading }),

  hasPermission: (permission) => hasPermission(get().permissions, permission),
})

export const authStoreFactory = () =>
  createStore<AuthStore>()(
    persist(storeBody, {
      name: 'le-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: toPersisted as unknown as (s: AuthStore) => PersistedSlice,
      merge: (persisted, current) => fromPersisted(persisted, current),
    }),
  )

export const useAuthStore = create<AuthStore>()(
  persist(storeBody, {
    name: 'le-auth',
    storage: createJSONStorage(() => sessionStorage),
    partialize: toPersisted as unknown as (s: AuthStore) => PersistedSlice,
    merge: (persisted, current) => fromPersisted(persisted, current),
  }),
)

export const selectUser        = (s: AuthStore) => s.user
export const selectToken       = (s: AuthStore) => s.accessToken
export const selectAccessScope = (s: AuthStore) => s.accessScope
export const selectPermissions = (s: AuthStore) => s.permissions
export const selectMenuItems   = (s: AuthStore) => s.menuItems
export const selectIsLoading   = (s: AuthStore) => s.isLoading
export const selectIsAuth      = (s: AuthStore) => !!s.accessToken && !!s.user
