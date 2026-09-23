/**
 * DynamicSidebarNav — builds nav from /api/user/get/access/menu
 * (same as old FuseNavigation for ROLE_ADMIN / ROLE_SUB_ADMIN).
 */
import { useMemo } from "react"
import { Box, List, Skeleton, Typography } from "@mui/material"
import { useAuthStore } from "@lib/store/authStore"
import { buildNavFromMenu } from "@/lib/nav/buildNavFromMenu"
import { NavItemList } from "./NavItemList"

interface Props {
  collapsed: boolean
  onNavClick?: () => void
}

export function DynamicSidebarNav({ collapsed, onNavClick }: Props) {
  const menuItems = useAuthStore((s) => s.menuItems)
  const menuLoading = useAuthStore((s) => s.menuLoading)
  const isSubAdminOnly = useAuthStore((s) => {
    const roles = s.user?.roles
    if (!roles?.length) return false
    return roles.includes("ROLE_SUB_ADMIN") && !roles.includes("ROLE_ADMIN")
  })

  const items = useMemo(
    () => buildNavFromMenu(menuItems, {
      // Old Fuse: SUB_ADMIN filters by accessPermission.visible
      filterVisible: isSubAdminOnly,
    }),
    [menuItems, isSubAdminOnly],
  )

  if (menuLoading && !menuItems.length) {
    return (
      <List disablePadding sx={{ pt: 1, px: 1 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75, mb: 0.25 }}>
            <Skeleton variant="circular" width={20} height={20} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
            {!collapsed && <Skeleton width={110} height={16} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />}
          </Box>
        ))}
      </List>
    )
  }

  if (!items.length) {
    return (
      <Box sx={{ px: 2, py: 3 }}>
        {!collapsed && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
            No menu items available
          </Typography>
        )}
      </Box>
    )
  }

  return <NavItemList items={items} collapsed={collapsed} onNavClick={onNavClick} />
}
