import { env } from "@/config/env"
import { redirect }    from "react-router-dom"
import { useAuthStore } from "@lib/store/authStore"

export function protectedLoader(routeUrl?: string) {
  return (): Response | null => {
    const store = useAuthStore.getState()
    // In static mode: allow if user is set (token lives only in memory after factory login)
    const isAuthed = !!store.accessToken || (env.USE_STATIC_DATA && !!store.user)
    if (!isAuthed) return redirect("/login") as unknown as Response
    if (routeUrl) {
      const menu = store.menuItems ?? []
      if (menu.length > 0) {
        const all = [...menu, ...menu.flatMap(m => (m as {children?: unknown[]}).children ?? [])]
        const item = all.find(m => (m as {url?: string}).url === routeUrl)
        if (item) {
          const perm = (item as {accessPermission?: {visible?: boolean}}).accessPermission
          if (perm && perm.visible === false) return redirect("/403") as unknown as Response
        }
      }
    }
    return null
  }
}