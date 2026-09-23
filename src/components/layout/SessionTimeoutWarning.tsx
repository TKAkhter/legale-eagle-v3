import { useTranslation } from 'react-i18next'
/**
 * SessionTimeoutWarning.tsx — shows a dismissible warning banner
 * 2 minutes before the session token expires.
 *
 * Mounted once in MainLayout. Polls token expiry every 30s.
 * {t("layout.sessionStayLoggedIn", "Stay logged in")} silently refreshes the token.
 * {t("layout.sessionLogOut", "Log out")} calls authApi.logout().
 */
import { useState, useEffect, useCallback } from 'react'
import { Alert, Button, Box, LinearProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@lib/store/authStore'
import { axiosClient } from '@lib/api/axios'
import { env } from '@/config/env'

const WARNING_BEFORE_MS = 2 * 60 * 1000  // show warning 2 min before expiry
const POLL_INTERVAL_MS  = 30 * 1000      // check every 30s
const SESSION_TTL_MS    = 60 * 60 * 1000 // 1 hour default session

export function SessionTimeoutWarning() {
  const { t } = useTranslation()
  const [show,      setShow]      = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const navigate  = useNavigate()

  // Stable snapshot — never call Date.now() inside a zustand selector
  const authTime  = useAuthStore(s => (s as { _authTime?: number })._authTime) ?? 0
  const sessionStart = authTime || undefined

  const check = useCallback(() => {
    if (env.USE_STATIC_DATA) return  // no real session in static mode
    const start = sessionStart ?? Date.now()
    const elapsed   = Date.now() - start
    const remaining = SESSION_TTL_MS - elapsed
    if (remaining <= 0) {
      // Session already expired — force logout
      clearAuth()
      navigate('/login')
      return
    }
    setRemaining(remaining)
    if (remaining <= WARNING_BEFORE_MS && !dismissed) {
      setShow(true)
    } else {
      setShow(false)
    }
  }, [sessionStart, dismissed, clearAuth, navigate])

  useEffect(() => {
    check()
    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [check])

  async function handleStayLoggedIn() {
    try {
      const { accessToken, refreshToken, accessScope, user } = useAuthStore.getState()
      await axiosClient.post('/api/auth/refresh/token', {
        token: accessToken,
        refreshToken,
        userId: user?.id,
        accessScope,
      })
      setShow(false)
      setDismissed(false)
    } catch {
      clearAuth()
      navigate('/login')
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  if (!show) return null

  const minutesLeft = Math.ceil(remaining / 60000)
  const progress    = ((remaining - 0) / WARNING_BEFORE_MS) * 100

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 24, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: { xs: '90vw', sm: 480 },
    }}>
      <Alert
        severity="warning"
        onClose={() => setDismissed(true)}
        sx={{ boxShadow: 6, borderRadius: 2 }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" color="inherit" onClick={handleLogout}>Log out</Button>
            <Button size="small" variant="outlined" color="inherit" onClick={handleStayLoggedIn}>
              Stay logged in
            </Button>
          </Box>
        }
      >
        {t("layout.sessionExpiringSoon", { minutes: minutesLeft })}
        <LinearProgress
          variant="determinate"
          value={Math.max(0, progress)}
          sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: 'warning.light' }}
        />
      </Alert>
    </Box>
  )
}
