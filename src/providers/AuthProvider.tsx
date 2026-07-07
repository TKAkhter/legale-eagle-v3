import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@lib/store/authStore'
import { bootstrapAxiosAuth, axiosClient } from '@lib/api/axios'
import { resolvePermissions, buildAdminPermissions } from '@lib/auth/permissions'
import { QK } from '@lib/query/keys'
import type { ApiMenuItem, ApiUserGroup } from '@/types/auth.types'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)
  const setMenuItems = useAuthStore(s => s.setMenuItems)

  // Wire all 6 axios auth callbacks once on mount — no dynamic import needed
  useEffect(() => {
    bootstrapAxiosAuth({
      getToken:        () => useAuthStore.getState().accessToken,
      getRefreshToken: () => useAuthStore.getState().refreshToken,
      getUserId:       () => useAuthStore.getState().user?.id ?? null,
      getAccessScope:  () => useAuthStore.getState().accessScope,
      clearAuth:       () => useAuthStore.getState().clearAuth(),
      setToken:        (t) => useAuthStore.getState().setToken(t),
    })
  }, [])

  // Fetch menu + group permissions in parallel after login
  useQuery({
    queryKey: QK.auth.menu(),
    queryFn: async () => {
      const [menuRes, groupRes] = await Promise.allSettled([
        axiosClient.get('/api/user/get/access/menu'),
        axiosClient.get('/api/group/get'),
      ])

      const menuItems: ApiMenuItem[] =
        menuRes.status === 'fulfilled'
          ? (menuRes.value.data?.data ?? menuRes.value.data ?? [])
          : []

      const rawGroups =
        groupRes.status === 'fulfilled'
          ? (groupRes.value.data?.data ?? groupRes.value.data ?? [])
          : []
      const groups: ApiUserGroup[] = Array.isArray(rawGroups) ? rawGroups : [rawGroups].filter(Boolean)

      const isAdmin = useAuthStore.getState().user?.companyUserType === 'ADMIN'
      const permissions = isAdmin ? buildAdminPermissions() : resolvePermissions(menuItems, groups)

      setMenuItems(menuItems, permissions)
      return menuItems
    },
    enabled:   !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry:     1,
  })

  return <>{children}</>
}
