import { Box, Typography, Paper, Divider, Switch, FormControlLabel, Button, Alert } from '@mui/material'
import { useState } from 'react'
import { useThemeStore } from '@lib/store/themeStore'
import { useAuthStore } from '@lib/store/authStore'
import { featureFlags } from '@config/featureFlags'

export default function SettingsPage() {
  const colorMode = useThemeStore(s => s.colorMode)
  const toggleColorMode = useThemeStore(s => s.toggleColorMode)
  const language = useThemeStore(s => s.language)
  const toggleLanguage = useThemeStore(s => s.toggleLanguage)
  const user = useAuthStore(s => s.user)
  const [saved, setSaved] = useState(false)

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Settings</Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>My Profile</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
          <Box><Typography variant="caption" color="text.secondary">Name</Typography><Typography sx={{ fontWeight: 500 }}>{user?.firstName} {user?.lastName}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Email</Typography><Typography sx={{ fontWeight: 500 }}>{user?.email}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Role</Typography><Typography sx={{ fontWeight: 500 }}>{user?.companyUserType}</Typography></Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Appearance</Typography>
        <FormControlLabel control={<Switch checked={colorMode === 'dark'} onChange={toggleColorMode} />} label="Dark mode" />
        <Divider sx={{ my: 2 }} />
        <FormControlLabel control={<Switch checked={language === 'ar'} onChange={toggleLanguage} />} label="Arabic (RTL)" />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>App Configuration</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2"><strong>API URL:</strong> {import.meta.env['VITE_API_BASE_URL']}</Typography>
          <Typography variant="body2"><strong>Environment:</strong> {import.meta.env['VITE_APP_ENV'] ?? 'development'}</Typography>
          <Typography variant="body2"><strong>Microsoft SSO:</strong> {featureFlags.forceMicrosoftSSO ? 'Enabled' : 'Disabled'}</Typography>
          <Typography variant="body2"><strong>User Registration:</strong> {featureFlags.enableUserRegistration ? 'Enabled' : 'Disabled'}</Typography>
        </Box>
      </Paper>

      {saved && <Alert severity="success" sx={{ mt: 2 }}>Settings saved.</Alert>}
    </Box>
  )
}
