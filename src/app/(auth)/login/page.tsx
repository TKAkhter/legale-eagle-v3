import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Button, Divider, Alert, CircularProgress, Typography } from '@mui/material'
import { useNavigate, Link } from 'react-router-dom'
import { axiosClient } from '@lib/api/axios'
import { useAuthStore } from '@lib/store/authStore'
import { extractAccessScope } from '@lib/auth/jwt'
import { featureFlags } from '@config/featureFlags'
import { ControlledInput } from '@components/forms/ControlledInput'
import { msalLoginPopup } from '@lib/auth/msal'
import WindowIcon from '@mui/icons-material/Window'

const schema = z.object({ username: z.string().email('Invalid email'), password: z.string().min(1, 'Required') })
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    setError('')
    try {
      const res = await axiosClient.post('/api/auth/signin', data)
      const payload = res.data?.data ?? res.data
      const token = payload?.token ?? payload?.accessToken
      setAuth({ user: payload?.user ?? payload, accessToken: token, refreshToken: payload?.refreshToken, accessScope: extractAccessScope(token) })
      navigate('/dashboard')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid email or password')
    }
  }

  async function handleMSLogin() {
    try {
      const result = await msalLoginPopup()
      const res = await axiosClient.post('/api/auth/signin/app', { msToken: result.accessToken })
      const payload = res.data?.data ?? res.data
      const token = payload?.token ?? payload?.accessToken
      setAuth({ user: payload?.user ?? payload, accessToken: token, refreshToken: payload?.refreshToken, accessScope: extractAccessScope(token) })
      navigate('/dashboard')
    } catch { setError('Microsoft login failed') }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.75, color: 'text.primary' }}>Welcome back</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Sign in to your LegalEagle account</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!featureFlags.forceMicrosoftSSO && (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ControlledInput name="username" control={control} label="Email address" type="email" required />
          <Box>
            <ControlledInput name="password" control={control} label="Password" type="password" required />
            <Box sx={{ textAlign: 'right', mt: 0.5 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#00B4A6', textDecoration: 'none' }}>Forgot password?</Link>
            </Box>
          </Box>
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth sx={{ mt: 0.5 }}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 2.5 }}><Typography variant="caption" color="text.secondary">or</Typography></Divider>
      <Button variant="outlined" size="large" startIcon={<WindowIcon />} onClick={handleMSLogin} fullWidth>
        Continue with Microsoft
      </Button>

      {featureFlags.enableUserRegistration && (
        <Typography variant="body2" sx={{ mt: 2.5, textAlign: 'center' }} color="text.secondary">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#0F3C6E', fontWeight: 500 }}>Create one</Link>
        </Typography>
      )}
    </Box>
  )
}
