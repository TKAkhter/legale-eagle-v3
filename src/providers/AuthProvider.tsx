import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@lib/store/authStore'
import { bootstrapAxiosAuth, axiosClient } from '@lib/api/axios'
import { resolvePermissions, buildAdminPermissions } from '@lib/auth/permissions'
import { QK } from '@lib/query/keys'
import type { ApiMenuItem, ApiUserGroup } from '@/types/auth.types'

/**
 * AuthProvider
 *
 * Fetches BOTH endpoints needed to build the real permission set:
 *   1. GET /api/user/get/access/menu  -> menu tree (no permission flags)
 *   2. GET /api/group/get             -> SubmenuPermission flags by menuId
 *
 * These are joined in resolvePermissions(). If either call fails (e.g. the
 * group endpoint 403s for non-admin roles on some deployments), we fail open
 * on visibility: any menu item the user CAN see is treated as view-accessible,
 * since the backend already filtered that tree to this user.
 *
 * ADMIN safety net: companyUserType === 'ADMIN' always gets the full
 * permission set regardless of what the menu/group endpoints return, so a
 * misconfigured backend group never locks an admin out of their own app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setMenuItems = useAuthStore((s) => s.setMenuItems)

  useEffect(() => {
    bootstrapAxiosAuth({
      getToken:       () => useAuthStore.getState().accessToken,
      getAccessScope: () => useAuthStore.getState().accessScope,
      clearAuth:      () => useAuthStore.getState().clearAuth(),
      setToken:       (t) => useAuthStore.getState().setToken(t),
    })
  }, [])

  useQuery({
    queryKey: QK.auth.menu(),
    queryFn: async () => {
      const [menuRes, groupRes] = await Promise.allSettled([
        axiosClient.get('/api/user/get/access/menu'),
        axiosClient.get('/api/group/get'),
      ])

      const menuItems: ApiMenuItem[] =
        menuRes.status === 'fulfilled' ? (menuRes.value.data?.data ?? menuRes.value.data ?? []) : []

      const rawGroups = groupRes.status === 'fulfilled' ? (groupRes.value.data?.data ?? groupRes.value.data ?? []) : []
      const groups: ApiUserGroup[] = Array.isArray(rawGroups) ? rawGroups : [rawGroups].filter(Boolean)

      const isAdmin = useAuthStore.getState().user?.companyUserType === 'ADMIN'
      const permissions = isAdmin ? buildAdminPermissions() : resolvePermissions(menuItems, groups)

      setMenuItems(menuItems, permissions)
      return menuItems
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return <>{children}</>
}
