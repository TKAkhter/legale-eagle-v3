/**
 * Sidebar.tsx
 *
 * Responsive sidebar navigation with three behaviours:
 *
 *   Desktop (≥1024px):
 *     - Persistent sidebar, always visible
 *     - Hamburger (in Toolbar) → toggles collapsed/expanded
 *     - Hover over collapsed → temporarily expands
 *     - Hover out → returns to collapsed
 *
 *   Tablet (600px–1023px):
 *     - Starts collapsed by default
 *     - Hamburger → toggles between collapsed and full width
 *     - No hover expand (touch devices)
 *
 *   Mobile (<600px):
 *     - Hidden by default
 *     - Hamburger → opens as overlay drawer
 *     - Tapping outside or nav item → closes drawer
 *
 * Nav content:
 *   VITE_DYNAMIC_NAV=true  → items filtered by API menu response (what user has access to)
 *   VITE_DYNAMIC_NAV=false → items from static navigationConfig (shows everything)
 */
import { useState } from "react"
import { Box, Drawer, ThemeProvider, useMediaQuery } from "@mui/material"
import { useThemeStore }  from "@lib/store/themeStore"
import { buildSidebarTheme } from "@/config/theme"
import { SidebarNav }    from "./SidebarNav"
import { SidebarHeader } from "./SidebarHeader"
import { logger }        from "@/lib/logger"

// Sidebar widths
export const SIDEBAR_W   = 260   // expanded width
export const COLLAPSED_W = 60    // icon-only collapsed width

interface Props {
  /** Mobile drawer open state — controlled by Toolbar hamburger */
  mobileOpen:    boolean
  /** Called when mobile drawer should close (backdrop tap, nav click) */
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const collapsed  = useThemeStore(s => s.sidebarCollapsed)
  const direction  = useThemeStore(s => s.direction)
  const sideTheme  = buildSidebarTheme(direction)

  // Hover expand — desktop only (isDesktop prevents hover on touch devices)
  const [hovered, setHovered]  = useState(false)
  const isDesktop  = useMediaQuery("(min-width:1024px)")
  const isTablet   = useMediaQuery("(min-width:600px) and (max-width:1023px)")

  // On desktop: hover expands collapsed sidebar temporarily
  const effectiveCollapsed = collapsed && !(isDesktop && hovered)
  const width = effectiveCollapsed ? COLLAPSED_W : SIDEBAR_W

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

  // Inner content — shared between mobile drawer and desktop persistent nav
  const inner = (
    <ThemeProvider theme={sideTheme}>
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          // buildSidebarTheme provides dark navy background
          bgcolor: "background.default",
          overflow: "hidden",
          // Smooth width transition for hover expand / collapse toggle
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <SidebarHeader collapsed={effectiveCollapsed} />
        <Box sx={{ flex: 1, overflow: "hidden auto", py: 0.5 }}>
          <SidebarNav collapsed={effectiveCollapsed} onNavClick={onMobileClose} />
        </Box>
      </Box>
    </ThemeProvider>
  )

  return (
    <>
      {/* ── Mobile: full-screen overlay drawer ─────────────────────────── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}  // keeps DOM for performance
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_W,
            border: "none",
            bgcolor: "transparent",
          },
        }}
      >
        {inner}
      </Drawer>

      {/* ── Tablet: persistent but starts collapsed ─────────────────────── */}
      {isTablet && (
        <Box
          component="nav"
          sx={{
            position: "fixed",
            top: 0, bottom: 0,
            left: direction === "rtl" ? "auto" : 0,
            right: direction === "rtl" ? 0 : "auto",
            zIndex: 1200,
            width: effectiveCollapsed ? COLLAPSED_W : SIDEBAR_W,
            transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            display: { xs: "none", sm: "flex", lg: "none" },
          }}
        >
          {inner}
        </Box>
      )}

      {/* ── Desktop: persistent sidebar ─────────────────────────────────── */}
      <Box
        component="nav"
        sx={{
          display: { xs: "none", lg: "flex" },
          flexShrink: 0,
          position: "fixed",
          top: 0, bottom: 0,
          left: direction === "rtl" ? "auto" : 0,
          right: direction === "rtl" ? 0 : "auto",
          zIndex: 1100,
          width,
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {inner}
      </Box>
    </>
  )
}
