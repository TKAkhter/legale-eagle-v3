import { useAuthStore } from '@lib/store/authStore'
import { hasPermission } from '@lib/auth/permissions'

export function usePermission(permission: string): boolean {
  return useAuthStore((s) => hasPermission(s.permissions, permission))
}
export function usePermissions(permissions: string[]): Record<string, boolean> {
  const perms = useAuthStore((s) => s.permissions)
  return Object.fromEntries(permissions.map((p) => [p, hasPermission(perms, p)]))
}
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.user?.companyUserType === 'ADMIN')
}
