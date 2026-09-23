/**
 * SidebarNav — picks Static vs Dynamic like old FuseNavigation:
 *   ROLE_SUPER_ADMIN (or VITE_DYNAMIC_NAV=false) → StaticSidebarNav
 *   ROLE_ADMIN / ROLE_SUB_ADMIN                  → DynamicSidebarNav (API menu)
 */
import { useAuthStore } from "@lib/store/authStore"
import { env } from "@/config/env"
import { StaticSidebarNav } from "./nav/StaticSidebarNav"
import { DynamicSidebarNav } from "./nav/DynamicSidebarNav"

interface Props {
  collapsed: boolean
  onNavClick?: () => void
}

export function SidebarNav({ collapsed, onNavClick }: Props) {
  // Boolean snapshot — never return a new [] from the selector
  const isSuperAdmin = useAuthStore((s) => s.user?.roles?.includes("ROLE_SUPER_ADMIN") ?? false)

  // Old LMS: SUPER_ADMIN keeps Fuse static navigationConfig; everyone else uses API menu.
  const useStatic = !env.DYNAMIC_NAV || isSuperAdmin

  if (useStatic) {
    return <StaticSidebarNav collapsed={collapsed} onNavClick={onNavClick} />
  }

  return <DynamicSidebarNav collapsed={collapsed} onNavClick={onNavClick} />
}
