import { useState } from "react"
import { Box, useMediaQuery } from "@mui/material"
import { Outlet } from "react-router-dom"
import { Sidebar, SIDEBAR_W, COLLAPSED_W } from "./Sidebar"
import { Toolbar } from "./Toolbar"
import { useThemeStore } from "@lib/store/themeStore"
import { ToastContainer } from '@/components/ui/ToastContainer'
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

const TOOLBAR_H = 56

export function MainLayout() {
  const collapsed  = useThemeStore((s) => s.sidebarCollapsed)
  const direction  = useThemeStore((s) => s.direction)
  const isDesktop  = useMediaQuery("(min-width:1024px)")
  const [mobileOpen, setMobileOpen] = useState(false)

  const sw = isDesktop ? (collapsed ? COLLAPSED_W : SIDEBAR_W) : 0
  const ml = direction === "rtl" ? 0 : sw
  const mr = direction === "rtl" ? sw : 0

  return (
    <Box sx={{ display:"flex", minHeight:"100vh", bgcolor:"background.default" }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box sx={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, ml:`${ml}px`, mr:`${mr}px`, transition:"margin .2s" }}>
        <Toolbar sidebarWidth={sw} onMobileMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ height: TOOLBAR_H, flexShrink:0 }} />

        <Box component="main" sx={{ flex:1, p:{ xs:2, sm:3 } }}>
          <Box sx={{ maxWidth: 1400, mx:"auto" }}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
            <ToastContainer />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
