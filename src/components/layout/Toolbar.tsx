/**
 * Toolbar.tsx
 *
 * FIX: Uses buildToolbarTheme so the header background switches in dark mode.
 * Previously the toolbar used a static white background — now it reads colorMode.
 */
import { useState } from "react"
import {
  AppBar, Box, IconButton, ThemeProvider, Tooltip,
  Avatar, Menu, MenuItem, Divider, Typography, useMediaQuery,
} from "@mui/material"
import MenuIcon            from "@mui/icons-material/Menu"
import DarkModeIcon        from "@mui/icons-material/DarkMode"
import LightModeIcon       from "@mui/icons-material/LightMode"
import TranslateIcon       from "@mui/icons-material/Translate"
import LogoutIcon          from "@mui/icons-material/Logout"
import AccountCircleIcon   from "@mui/icons-material/AccountCircle"
import { useNavigate }     from "react-router-dom"
import { buildToolbarTheme } from "@/config/theme"
import { useThemeStore }   from "@lib/store/themeStore"
import { useAuthStore }    from "@lib/store/authStore"
import { GlobalSearch }    from "./GlobalSearch"
import { NotificationsPanel } from "./NotificationsPanel"

interface Props {
  sidebarWidth: number
  onMobileMenuClick: () => void
}

export function Toolbar({ sidebarWidth, onMobileMenuClick }: Props) {
  const navigate      = useNavigate()
  const colorMode  = useThemeStore((s) => s.colorMode)
  const direction  = useThemeStore((s) => s.direction)
  const toggleMode = useThemeStore((s) => s.toggleColorMode)
  const toggleLang = useThemeStore((s) => s.toggleLanguage)
  const logout     = useAuthStore((s) => s.clearAuth)
  const user       = useAuthStore((s) => s.user)
  const isDesktop     = useMediaQuery("(min-width:1024px)")
  const toolbarTheme  = buildToolbarTheme(colorMode, direction)

  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()

  function handleLogout() {
    // clearAuthToken removed()
    logout()
    navigate("/login")
  }

  return (
    <ThemeProvider theme={toolbarTheme}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          left:   direction === "rtl" ? 0 : isDesktop ? sidebarWidth : 0,
          right:  direction === "rtl" ? isDesktop ? sidebarWidth : 0 : 0,
          width:  "auto",
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1201,
          transition: "left .2s, right .2s",
        }}
      >
        <Box sx={{ height: 56, display:"flex", alignItems:"center", px: 2, gap: 1 }}>
          {/* Mobile menu toggle */}
          {!isDesktop && (
            <IconButton size="small" onClick={onMobileMenuClick} edge="start">
              <MenuIcon />
            </IconButton>
          )}

          <GlobalSearch />
          <Box sx={{ flex: 1 }} />

          <NotificationsPanel />

          <Tooltip title={colorMode === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton size="small" onClick={toggleMode}>
              {colorMode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle language">
            <IconButton size="small" onClick={toggleLang}>
              <TranslateIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
            <Avatar sx={{ width:30, height:30, fontSize:12, bgcolor:"primary.main" }}>
              {user?.profilePic ? <img src={user.profilePic} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : initials}
            </Avatar>
          </IconButton>

          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 180 } } }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchor(null); navigate("/admin/settings") }}>
              <AccountCircleIcon fontSize="small" sx={{ mr: 1.5 }} /> Profile & Settings
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </AppBar>
    </ThemeProvider>
  )
}
