import { useState } from 'react'
import {
  AppBar, Box, IconButton, Tooltip, Avatar, Typography, ThemeProvider,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import TranslateIcon from '@mui/icons-material/Translate'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useNavigate } from 'react-router-dom'
import { toolbarTheme } from '@config/theme'
import { useThemeStore } from '@lib/store/themeStore'
import { useAuthStore } from '@lib/store/authStore'
import { msalSignOut } from '@lib/auth/msal'
import { StopwatchWidget } from './StopwatchWidget'
import { NotificationsPanel } from './NotificationsPanel'

/**
 * Toolbar
 *
 * FIX (UI overlap bug): MUI's <AppBar position="fixed"> defaults to
 * left:0 / width:100% regardless of `left:'auto'` alone — that left the
 * menu icon and toolbar content rendering underneath the sidebar. The
 * toolbar now receives the live `sidebarWidth` from MainLayout and uses it
 * to offset both `left` and `width`, so it always starts exactly where the
 * sidebar ends and resizes when the sidebar collapses/expands.
 *
 * FIX (no logout): the user avatar is now a real menu trigger with a
 * Logout item that clears the auth store (and MSAL session if applicable)
 * and redirects to /login.
 */
interface Props { height: number; sidebarWidth: number }

export function Toolbar({ height, sidebarWidth }: Props) {
  const navigate = useNavigate()
  const toggleSidebar   = useThemeStore((s) => s.toggleSidebar)
  const toggleColorMode = useThemeStore((s) => s.toggleColorMode)
  const toggleLanguage  = useThemeStore((s) => s.toggleLanguage)
  const language        = useThemeStore((s) => s.language)
  const direction       = useThemeStore((s) => s.direction)
  const user            = useAuthStore((s) => s.user)
  const clearAuth        = useAuthStore((s) => s.clearAuth)

  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)

  async function handleLogout() {
    setUserMenuAnchor(null)
    try {
      // Best-effort: if the user signed in via Microsoft SSO, also clear
      // the MSAL session. Safe to call even if no MSAL session exists.
      await msalSignOut().catch(() => undefined)
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const offsetKey = direction === 'rtl' ? 'right' : 'left'

  return (
    <ThemeProvider theme={toolbarTheme}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height,
          [offsetKey]: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'left .2s, right .2s, width .2s',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Box sx={{ px: 2, gap: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
          <IconButton size="small" onClick={toggleSidebar}><MenuIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <StopwatchWidget />
          <NotificationsPanel />
          <Tooltip title="Toggle theme">
            <IconButton size="small" onClick={toggleColorMode}><Brightness4Icon /></IconButton>
          </Tooltip>
          <Tooltip title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
            <IconButton size="small" onClick={toggleLanguage}><TranslateIcon /></IconButton>
          </Tooltip>
          {user && (
            <>
              <Box
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{ gap: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', borderRadius: 2, px: 1, py: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</Typography>
                <Avatar src={user.profilePic} sx={{ width: 32, height: 32, fontSize: 13 }}>{user.firstName?.[0]}</Avatar>
              </Box>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: direction === 'rtl' ? 'left' : 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: direction === 'rtl' ? 'left' : 'right' }}
              >
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin/settings') }}>
                  <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>My Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin/settings') }}>
                  <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Log Out</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </AppBar>
    </ThemeProvider>
  )
}
