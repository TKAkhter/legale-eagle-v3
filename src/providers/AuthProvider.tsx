import { useEffect } from "react"
import { useAuthStore } from "@lib/store/authStore"
import { axiosClient } from "@lib/api/axios"
import { authApi } from "@/api/auth"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"

/**
 * Keeps axios auth header in sync and re-fetches the access menu when the
 * session was restored from storage without menuItems (or menu was cleared).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  const menuLen = useAuthStore((s) => s.menuItems.length)
  const isSuperAdmin = useAuthStore((s) => s.user?.roles?.includes("ROLE_SUPER_ADMIN") ?? false)
  const setMenuItems = useAuthStore((s) => s.setMenuItems)
  const setMenuLoading = useAuthStore((s) => s.setMenuLoading)

  useEffect(() => {
    if (token) {
      axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete axiosClient.defaults.headers.common["Authorization"]
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const ping = () => axiosClient.get("/api/user/check/session").catch(() => {})
    const id = setInterval(ping, 5 * 60_000)
    return () => clearInterval(id)
  }, [token])

  // Re-hydrate menu for dynamic nav when missing after page reload
  useEffect(() => {
    if (!token) return
    if (env.USE_STATIC_DATA) return
    if (!env.DYNAMIC_NAV) return
    if (isSuperAdmin) return
    if (menuLen > 0) return

    let cancelled = false
    ;(async () => {
      setMenuLoading(true)
      try {
        const [menu, groups] = await Promise.all([
          authApi.getMenu(token),
          authApi.getGroups(token),
        ])
        if (cancelled) return
        const { resolvePermissions } = await import("@lib/auth/permissions")
        const permissions = resolvePermissions(
          menu as import("@/types/auth.types").ApiMenuItem[],
          groups as import("@/types/auth.types").ApiUserGroup[],
        )
        setMenuItems(menu as import("@/types/auth.types").ApiMenuItem[], permissions)
        logger.info("AuthProvider", `Re-fetched menu (${(menu as unknown[]).length} items)`)
      } catch (err) {
        logger.warn("AuthProvider", "Failed to re-fetch menu", err)
        if (!cancelled) setMenuLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [token, menuLen, isSuperAdmin, setMenuItems, setMenuLoading])

  return <>{children}</>
}
