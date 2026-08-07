/**
 * Sidebar.tsx
 *
 * FIX 1: Always uses buildSidebarTheme (dark navy) — independent of app light/dark mode.
 * FIX 2: On desktop, hovering over a collapsed sidebar expands it temporarily.
 *        On tablet/mobile the hover expand does NOT trigger (touch devices).
 */
import { useState } from "react"
import { Box, Drawer, ThemeProvider, useMediaQuery } from "@mui/material"
import { useThemeStore } from "@lib/store/themeStore"
import { buildSidebarTheme } from "@/config/theme"
import { SidebarNav } from "./SidebarNav"
import { SidebarHeader } from "./SidebarHeader"

const SIDEBAR_W   = 264
const COLLAPSED_W = 64

interface Props {
  mobileOpen:    boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const collapsed  = useThemeStore((s) => s.sidebarCollapsed)
  const direction  = useThemeStore((s) => s.direction)
  const sideTheme  = buildSidebarTheme(direction)

  // hover-expand state (desktop only)
  const [hovered, setHovered] = useState(false)
  const isDesktop = useMediaQuery("(min-width:1024px)")

  // Effective width: collapsed + not hovered = narrow; else full
  const effectiveCollapsed = collapsed && !(isDesktop && hovered)
  const width = effectiveCollapsed ? COLLAPSED_W : SIDEBAR_W

  const content = (
    <ThemeProvider theme={sideTheme}>
      <Box
        onMouseEnter={() => isDesktop && collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          width,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          transition: "width .2s ease",
          overflow: "hidden",
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        <SidebarHeader collapsed={effectiveCollapsed} />
        <Box sx={{ flex: 1, overflow: "hidden auto", pt: 0.5 }}>
          <SidebarNav collapsed={effectiveCollapsed} />
        </Box>
      </Box>
    </ThemeProvider>
  )

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: SIDEBAR_W, border: "none" },
        }}
      >
        {content}
      </Drawer>

      {/* Desktop persistent sidebar */}
      <Box
        component="nav"
        sx={{
          display: { xs: "none", lg: "flex" },
          flexShrink: 0,
          width,
          transition: "width .2s ease",
          position: "fixed",
          top: 0, bottom: 0,
          left: direction === "rtl" ? "auto" : 0,
          right: direction === "rtl" ? 0 : "auto",
          zIndex: 1200,
        }}
      >
        {content}
      </Box>
    </>
  )
}

export { SIDEBAR_W, COLLAPSED_W }
