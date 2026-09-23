/**
 * StaticSidebarNav — Fuse static navigationConfig.
 * Used for ROLE_SUPER_ADMIN (old LMS) and when VITE_DYNAMIC_NAV=false.
 */
import { navigationConfig, type NavItem } from "@config/navigation"
import { useAuthStore } from "@lib/store/authStore"
import { hasPermission } from "@lib/auth/permissions"
import { NavItemList } from "./NavItemList"

interface Props {
  collapsed: boolean
  onNavClick?: () => void
}

export function StaticSidebarNav({ collapsed, onNavClick }: Props) {
  const permissions = useAuthStore((s) => s.permissions)
  const isSuperAdmin = useAuthStore((s) => s.user?.roles?.includes("ROLE_SUPER_ADMIN") ?? false)

  function isVisible(item: NavItem): boolean {
    // Old LMS SUPER_ADMIN sees full static navigationConfig unfiltered
    if (isSuperAdmin) return true
    if (!item.permission) return true
    // When permissions empty (not yet loaded), fail-open so static nav still shows
    if (!permissions.size) return true
    return hasPermission(permissions, item.permission)
  }

  return (
    <NavItemList
      items={navigationConfig}
      collapsed={collapsed}
      onNavClick={onNavClick}
      isVisible={isVisible}
    />
  )
}
