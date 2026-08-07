/**
 * MainLayout.tsx — root layout for all authenticated dashboard pages.
 *
 * Handles responsive sidebar behaviour:
 *
 *   Desktop (≥1024px):
 *     Hamburger → toggles sidebarCollapsed in themeStore
 *
 *   Tablet (600px–1023px):
 *     Hamburger → toggles sidebarCollapsed in themeStore
 *
 *   Mobile (<600px):
 *     Hamburger → opens/closes mobileOpen overlay drawer
 *
 * The sidebar reads sidebarCollapsed from themeStore and mobileOpen from here.
 */
import { useState }      from "react"
import { Box, useMediaQuery } from "@mui/material"
import { Outlet }        from "react-router-dom"
import { Sidebar, SIDEBAR_W, COLLAPSED_W } from "./Sidebar"
import { Toolbar }       from "./Toolbar"
import { CommandPalette } from './CommandPalette'
import { ToastContainer } from "@/components/ui/ToastContainer"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { useThemeStore } from "@lib/store/themeStore"
import { logger }        from "@/lib/logger"

const TOOLBAR_H = 56

export function MainLayout() {
  const collapsed       = useThemeStore(s => s.sidebarCollapsed)
  const toggleSidebar   = useThemeStore(s => s.toggleSidebar)
  const direction       = useThemeStore(s => s.direction)

  // Mobile overlay drawer state (only used on mobile <600px)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width:1024px)")
  const isTablet  = useMediaQuery("(min-width:600px) and (max-width:1023px)")
  const isMobile  = useMediaQuery("(max-width:599px)")

  /**
   * Hamburger click — different behaviour per viewport:
   *   Desktop/Tablet → toggle collapsed state (persistent sidebar)
   *   Mobile         → toggle overlay drawer
   */
  function handleHamburgerClick() {
    if (isMobile) {
      logger.debug("MainLayout", "Mobile hamburger — toggling drawer")
      setMobileOpen(prev => !prev)
    } else {
      logger.debug("MainLayout", `${isTablet ? "Tablet" : "Desktop"} hamburger — toggling sidebar`)
      toggleSidebar()
    }
  }

  // Calculate sidebar width for content margin offset
  const sidebarWidth = (() => {
    if (isMobile)  return 0                          // mobile: no persistent sidebar
    if (isTablet)  return collapsed ? COLLAPSED_W : SIDEBAR_W
    if (isDesktop) return collapsed ? COLLAPSED_W : SIDEBAR_W
    return SIDEBAR_W
  })()

  // Content margin — push content right of sidebar on desktop/tablet
  const contentMl = direction === "rtl" ? 0 : sidebarWidth
  const contentMr = direction === "rtl" ? sidebarWidth : 0

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Sidebar — handles its own visibility per viewport */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,           // prevents flexbox overflow
          ml: `${contentMl}px`,
          mr: `${contentMr}px`,
          // Smooth margin transition matches sidebar width transition
          transition: "margin 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Top toolbar */}
        <Toolbar
          sidebarWidth={sidebarWidth}
          onMobileMenuClick={handleHamburgerClick}
        />

        {/* Spacer equal to toolbar height */}
        <Box sx={{ height: TOOLBAR_H, flexShrink: 0 }} />

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 2.5, md: 3 },
            // On mobile, content takes full width with comfortable padding
            maxWidth: "100%",
          }}
        >
          <Box sx={{ maxWidth: 1400, mx: "auto" }}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>

      {/* Global command palette — Ctrl+K opens from anywhere */}
      <CommandPalette />
      {/* Global toast notifications */}
      <ToastContainer />
    </Box>
  )
}
