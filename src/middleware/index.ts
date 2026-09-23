import { env } from "@/config/env"
import { redirect }    from "react-router-dom"
import { useAuthStore } from "@lib/store/authStore"

export function protectedLoader(routeUrl?: string) {
  return (): Response | null => {
    const store = useAuthStore.getState()
    // In static mode: allow if user is set (token lives only in memory after factory login)
    const isAuthed = !!store.accessToken || (env.USE_STATIC_DATA && !!store.user)
    if (!isAuthed) return redirect("/login") as unknown as Response
    // Auth gate only — menu visibility is enforced in SidebarNav.
    // Do not 403 on URL mismatch (BE still returns legacy Fuse paths).
    void routeUrl
    return null
  }
}