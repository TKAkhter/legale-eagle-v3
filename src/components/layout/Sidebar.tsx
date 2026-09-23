/**
 * Sidebar.tsx
 *
 * Desktop (≥1024px): persistent sidebar; hamburger collapses to icons; hover expands.
 * Tablet + Mobile (<1024px): temporary overlay drawer — always shows labels
 *   (never icon-only; collapsed store state only applies on desktop).
 */
import { useState } from "react"
import { Box, Drawer, ThemeProvider, useMediaQuery } from "@mui/material"
import { useThemeStore }  from "@lib/store/themeStore"
import { buildSidebarTheme } from "@/config/theme"
import { DESKTOP_MEDIA_QUERY, DESKTOP_MIN_WIDTH } from "@/config/spacing"
import { SidebarNav }    from "./SidebarNav"
import { SidebarHeader } from "./SidebarHeader"
import { logger }        from "@/lib/logger"

export const SIDEBAR_W   = 260
export const COLLAPSED_W = 60

interface Props {
  mobileOpen:    boolean
  onMobileClose: () => void
}

function SidebarInner({
  collapsed,
  onNavClick,
  onMouseEnter,
  onMouseLeave,
}: {
  collapsed: boolean
  onNavClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const direction = useThemeStore(s => s.direction)
  const sideTheme = buildSidebarTheme(direction)

  return (
    <ThemeProvider theme={sideTheme}>
      <Box
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          overflow: "hidden",
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <SidebarHeader collapsed={collapsed} />
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            py: 0.5,
            // Avoid always-visible scrollbar (screenshot); show only on hover
            scrollbarWidth: "thin",
            scrollbarColor: "transparent transparent",
            "&:hover": { scrollbarColor: "rgba(255,255,255,0.25) transparent" },
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "transparent",
              borderRadius: 4,
            },
            "&:hover::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(255,255,255,0.25)",
            },
          }}
        >
          <SidebarNav collapsed={collapsed} onNavClick={onNavClick} />
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const collapsed  = useThemeStore(s => s.sidebarCollapsed)
  const direction  = useThemeStore(s => s.direction)

  const [hovered, setHovered] = useState(false)
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)

  // Icon-only collapse is desktop-only. Overlay drawers always show text.
  const desktopCollapsed = isDesktop && collapsed && !hovered
  const desktopWidth = desktopCollapsed ? COLLAPSED_W : SIDEBAR_W

  function handleMouseEnter() {
    if (isDesktop && collapsed) {
      logger.debug("Sidebar", "Hover expand triggered")
      setHovered(true)
    }
  }

  function handleMouseLeave() {
    if (hovered) {
      logger.debug("Sidebar", "Hover collapse triggered")
      setHovered(false)
    }
  }

  const belowDesktop = `@media (max-width:${DESKTOP_MIN_WIDTH - 1}px)`
  const atDesktop = `@media (min-width:${DESKTOP_MIN_WIDTH}px)`

  return (
    <>
      {/* Mobile + tablet: overlay drawer with full labels */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: "block",
          [atDesktop]: { display: "none" },
          zIndex: 1400,
          "& .MuiBackdrop-root": { zIndex: 1399 },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_W,
            maxWidth: "min(100vw, 300px)",
            border: "none",
            bgcolor: "transparent",
            zIndex: 1400,
          },
        }}
      >
        {/* Always expanded — never pass store collapsed into overlay */}
        <SidebarInner collapsed={false} onNavClick={onMobileClose} />
      </Drawer>

      {/* Desktop: persistent sidebar */}
      <Box
        component="nav"
        sx={{
          display: "none",
          [atDesktop]: { display: "flex" },
          flexShrink: 0,
          position: "fixed",
          top: 0,
          bottom: 0,
          left: direction === "rtl" ? "auto" : 0,
          right: direction === "rtl" ? 0 : "auto",
          zIndex: 1300,
          width: desktopWidth,
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          // Safety: if this nav somehow renders below desktop, never icon-only
          [belowDesktop]: { width: SIDEBAR_W },
        }}
      >
        <SidebarInner
          collapsed={desktopCollapsed}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Box>
    </>
  )
}
