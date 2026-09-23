import { PageTransition } from '@/components/ui/PageTransition'
/**
 * MainLayout — root layout for authenticated pages.
 *
 * Page gutter is consistent across breakpoints so titles and cards
 * share the same inset from the screen edge.
 */
import { useState, useEffect } from "react"
import { Box, useMediaQuery } from "@mui/material"
import { Outlet }        from "react-router-dom"
import { Sidebar, SIDEBAR_W, COLLAPSED_W } from "./Sidebar"
import { Toolbar, TOOLBAR_ROW_H, TOOLBAR_COMPACT_H } from "./Toolbar"
import { QuickCreateFAB } from '@/components/ui/QuickCreateFAB'
import { SessionTimeoutWarning } from './SessionTimeoutWarning'
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal'
import { CommandPalette } from './CommandPalette'
import { RouteProgress } from '@/components/ui/RouteProgress'
import { ToastContainer } from "@/components/ui/ToastContainer"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { useThemeStore } from "@lib/store/themeStore"
import { logger }        from "@/lib/logger"
import { PAGE_GUTTER, DESKTOP_MEDIA_QUERY } from "@/config/spacing"

export function MainLayout() {
  const collapsed       = useThemeStore(s => s.sidebarCollapsed)
  const toggleSidebar   = useThemeStore(s => s.toggleSidebar)
  const direction       = useThemeStore(s => s.direction)

  const [mobileOpen, setMobileOpen] = useState(false)

  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const isCompact = useMediaQuery("(max-width:899px)")

  // Close overlay when crossing into desktop so collapse state can't leak into drawer
  useEffect(() => {
    if (isDesktop && mobileOpen) setMobileOpen(false)
  }, [isDesktop, mobileOpen])

  /** < 1024: overlay drawer (labels always on). ≥ 1024: collapse/expand. */
  function handleHamburgerClick() {
    if (!isDesktop) {
      logger.debug("MainLayout", "Overlay hamburger — toggling drawer")
      setMobileOpen(prev => !prev)
    } else {
      logger.debug("MainLayout", "Desktop hamburger — toggling sidebar")
      toggleSidebar()
    }
  }

  const sidebarWidth = isDesktop
    ? (collapsed ? COLLAPSED_W : SIDEBAR_W)
    : 0

  const contentMl = direction === "rtl" ? 0 : sidebarWidth
  const contentMr = direction === "rtl" ? sidebarWidth : 0
  const toolbarH = isCompact ? TOOLBAR_COMPACT_H : TOOLBAR_ROW_H

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        maxHeight: "100vh",
        maxWidth: "100vw",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          maxWidth: "100%",
          height: "100%",
          overflow: "hidden",
          ml: `${contentMl}px`,
          mr: `${contentMr}px`,
          transition: "margin 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Toolbar
          sidebarWidth={sidebarWidth}
          onMobileMenuClick={handleHamburgerClick}
        />

        <Box sx={{ height: toolbarH, flexShrink: 0 }} />

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            px: PAGE_GUTTER,
            py: PAGE_GUTTER,
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "hidden",
            overflowY: "auto",
            boxSizing: "border-box",
            // Soften page scrollbar; prefer content-driven scroll only when needed
            scrollbarWidth: "thin",
            scrollbarGutter: "stable",
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "action.disabledBackground",
              borderRadius: 4,
            },
          }}
        >
          <Box sx={{ maxWidth: 1400, mx: "auto", width: "100%", minWidth: 0 }}>
            <ErrorBoundary>
              <PageTransition><Outlet /></PageTransition>
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>

      <QuickCreateFAB />
      <SessionTimeoutWarning />
      <KeyboardShortcutsModal />
      <CommandPalette />
      <RouteProgress />
      <ToastContainer />
    </Box>
  )
}
