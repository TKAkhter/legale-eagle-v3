import { useTranslation } from 'react-i18next'
import { StopwatchWidget } from './StopwatchWidget'
/**
 * Toolbar — wraps into two rows on tablet/mobile so content never exceeds viewport width.
 * Row 1: menu + search
 * Row 2: stopwatch + notifications + theme/lang + avatar
 * Desktop (≥900px): single row
 */
import { useState } from "react"
import {
  AppBar, Box, IconButton, ThemeProvider, Tooltip,
  Avatar, Menu, MenuItem, Divider, Typography, useMediaQuery,
} from "@mui/material"
import MenuIcon     from "@mui/icons-material/Menu"
import MenuOpenIcon  from "@mui/icons-material/MenuOpen"
import DarkModeIcon        from "@mui/icons-material/DarkMode"
import LightModeIcon       from "@mui/icons-material/LightMode"
import LogoutIcon          from "@mui/icons-material/Logout"
import AccountCircleIcon   from "@mui/icons-material/AccountCircle"
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined"
import { useNavigate }     from "react-router-dom"
import { buildToolbarTheme } from "@/config/theme"
import { useThemeStore }   from "@lib/store/themeStore"
import { useAuthStore }    from "@lib/store/authStore"
import { GlobalSearch }    from "./GlobalSearch"
import { NotificationsPanel } from "./NotificationsPanel"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { PAGE_GUTTER, DESKTOP_MEDIA_QUERY } from "@/config/spacing"

/** Single-row height; two-row height on compact viewports */
export const TOOLBAR_ROW_H = 56
export const TOOLBAR_COMPACT_H = 104

interface Props {
  sidebarWidth: number
  onMobileMenuClick: () => void
}

export function Toolbar({ sidebarWidth, onMobileMenuClick }: Props) {
  const navigate      = useNavigate()
  const colorMode  = useThemeStore((s) => s.colorMode)
  const direction  = useThemeStore((s) => s.direction)
  const toggleMode = useThemeStore((s) => s.toggleColorMode)
  const logout     = useAuthStore((s) => s.clearAuth)
  const user       = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const isDesktop   = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const isCompact   = useMediaQuery("(max-width:899px)")
  const collapsed   = useThemeStore(s => s.sidebarCollapsed)
  const toolbarTheme  = buildToolbarTheme(colorMode, direction)

  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const actions = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
      <StopwatchWidget />
      <NotificationsPanel />

      <Tooltip title={colorMode === "dark" ? t("settings.lightMode", "Light mode") : t("settings.darkMode", "Dark mode")}>
        <IconButton size="small" onClick={toggleMode}>
          {colorMode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <LanguageSwitcher compact />

      <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
        <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: "primary.main" }}>
          {user?.profilePic
            ? <img src={user.profilePic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 180, maxWidth: "calc(100vw - 24px)" } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchor(null); navigate("/profile") }}>
          <AccountCircleIcon fontSize="small" sx={{ mr: 1.5 }} /> Profile
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); navigate("/admin/settings") }}>
          <SettingsOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> Settings
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign Out
        </MenuItem>
      </Menu>
    </Box>
  )

  return (
    <ThemeProvider theme={toolbarTheme}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          left:   direction === "rtl" ? 0 : isDesktop ? sidebarWidth : 0,
          right:  direction === "rtl" ? isDesktop ? sidebarWidth : 0 : 0,
          width:  "auto",
          maxWidth: "100%",
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1201,
          transition: "left .2s, right .2s",
          overflow: "hidden",
        }}
      >
        {isCompact ? (
          <Box sx={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%" }}>
            <Box
              sx={{
                minHeight: TOOLBAR_ROW_H,
                display: "flex",
                alignItems: "center",
                px: PAGE_GUTTER,
                gap: 1,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <IconButton
                size="small"
                onClick={onMobileMenuClick}
                aria-label="Toggle navigation"
                sx={{ flexShrink: 0 }}
              >
                {!isDesktop ? <MenuIcon /> : (!collapsed ? <MenuOpenIcon /> : <MenuIcon />)}
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <GlobalSearch fullWidth />
              </Box>
            </Box>
            <Box
              sx={{
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                px: PAGE_GUTTER,
                pb: 0.75,
                gap: 0.5,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                borderTop: "1px solid",
                borderColor: "divider",
                overflowX: "auto",
              }}
            >
              {actions}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              height: TOOLBAR_ROW_H,
              display: "flex",
              alignItems: "center",
              px: PAGE_GUTTER,
              gap: 1,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <IconButton
              size="small"
              onClick={onMobileMenuClick}
              aria-label="Toggle navigation"
              sx={{ flexShrink: 0 }}
            >
              {!isDesktop ? <MenuIcon /> : (!collapsed ? <MenuOpenIcon /> : <MenuIcon />)}
            </IconButton>

            <Box sx={{ flex: 1, minWidth: 0, maxWidth: 360 }}>
              <GlobalSearch fullWidth />
            </Box>
            <Box sx={{ flex: 1 }} />
            {actions}
          </Box>
        )}
      </AppBar>
    </ThemeProvider>
  )
}
