import { Box, Typography, Paper, Divider, Switch, FormControlLabel, Tabs as MuiTabs, Tab } from '@mui/material'
import { useState } from 'react'
import { useThemeStore } from '@lib/store/themeStore'
import { useAuthStore } from '@lib/store/authStore'
import { env } from '@config/featureFlags'
import { LookupManager } from './_components/LookupManager'

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const colorMode = useThemeStore(s => s.colorMode)
  const toggleColorMode = useThemeStore(s => s.toggleColorMode)
  const toggleLanguage = useThemeStore(s => s.toggleLanguage)
  const language = useThemeStore(s => s.language)
  const user = useAuthStore(s => s.user)

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight:700, mb:3 }}>Settings</Typography>
      <MuiTabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ borderBottom:1, borderColor:'divider', mb:3 }}>
        <Tab label="My Profile" />
        <Tab label="Appearance" />
        <Tab label="Practice Areas" />
        <Tab label="Lead Sources" />
        <Tab label="Departments" />
        <Tab label="Designations" />
        <Tab label="Session Rates" />
        <Tab label="System Info" />
      </MuiTabs>

      {tab === 0 && (
        <Paper variant="outlined" sx={{ p:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ fontWeight:600, mb:2 }}>My Profile</Typography>
          <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:2 }}>
            <Box><Typography variant="caption" color="text.secondary">Name</Typography><Typography sx={{ fontWeight:500 }}>{user?.firstName} {user?.lastName}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Email</Typography><Typography sx={{ fontWeight:500 }}>{user?.email}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Role</Typography><Typography sx={{ fontWeight:500 }}>{user?.companyUserType}</Typography></Box>
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ p:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ fontWeight:600, mb:2 }}>Appearance</Typography>
          <FormControlLabel control={<Switch checked={colorMode==='dark'} onChange={toggleColorMode} />} label="Dark mode" />
          <Divider sx={{ my:2 }} />
          <FormControlLabel control={<Switch checked={language==='ar'} onChange={toggleLanguage} />} label="Arabic (RTL)" />
        </Paper>
      )}

      {tab === 2 && <LookupManager title="Practice Areas" getUrl="/api/practice-area/get" addUrl="/api/practice-area/add" deleteUrl="/api/practice-area/delete" nameField="name" queryKey="practiceAreas" />}
      {tab === 3 && <LookupManager title="Lead Sources"   getUrl="/api/lead-source/get"   addUrl="/api/lead-source/add"   deleteUrl="/api/lead-source/delete"   nameField="name" queryKey="leadSources" />}
      {tab === 4 && <LookupManager title="Departments"    getUrl="/api/util/list/department" addUrl="/api/department/add"  deleteUrl="/api/department/delete"    nameField="name" queryKey="departments" />}
      {tab === 5 && <LookupManager title="Designations"   getUrl="/api/util/get/designation" addUrl="/api/designation/add" deleteUrl="/api/designation/delete"   nameField="name" queryKey="designations" />}
      {tab === 6 && <LookupManager title="Session Rates"  getUrl="/api/session-rate/get"  addUrl="/api/session-rate/add"  deleteUrl="/api/session-rate/delete"  nameField="name" queryKey="sessionRates" />}

      {tab === 7 && (
        <Paper variant="outlined" sx={{ p:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ fontWeight:600, mb:2 }}>System Info</Typography>
          <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
            <Typography variant="body2"><strong>API URL:</strong> {import.meta.env['VITE_API_BASE_URL']}</Typography>
            <Typography variant="body2"><strong>Environment:</strong> {import.meta.env['VITE_APP_ENV'] ?? 'development'}</Typography>
            <Typography variant="body2"><strong>Microsoft SSO:</strong> {env.VITE_FORCE_MICROSOFT_SSO ? 'Enabled' : 'Disabled'}</Typography>
            <Typography variant="body2"><strong>User Registration:</strong> {env.VITE_ENABLE_USER_REGISTRATION ? 'Enabled' : 'Disabled'}</Typography>
          </Box>
        </Paper>
      )}
    </Box>
  )
}
