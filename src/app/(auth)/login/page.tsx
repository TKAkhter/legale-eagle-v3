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
import MicrosoftIcon from '@mui/icons-material/Window'

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
      const accessScope = extractAccessScope(token)
      setAuth({ user: payload?.user ?? payload, accessToken: token, refreshToken: payload?.refreshToken, accessScope })
      navigate('/dashboard')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid credentials')
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
    <Box sx={{ gap: 2, display: "flex", flexDirection: "column" }}>
      {error && <Alert severity="error">{error}</Alert>}
      {!featureFlags.forceMicrosoftSSO && (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ControlledInput name="username" control={control} label="Email Address" type="email" required />
          <ControlledInput name="password" control={control} label="Password" type="password" required />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
          </Button>
          <Box sx={{ textAlign: "right" }}><Link to="/forgot-password"><Typography variant="body2" sx={{ color: "primary.main" }}>Forgot password?</Typography></Link></Box>
        </form>
      )}
      <Divider>or</Divider>
      <Button variant="outlined" size="large" startIcon={<MicrosoftIcon />} onClick={handleMSLogin} fullWidth>Continue with Microsoft</Button>
      {featureFlags.enableUserRegistration && (
        <Typography variant="body2" sx={{ textAlign: "center" }}>
          Don't have an account? <Link to="/register">Register</Link>
        </Typography>
      )}
    </Box>
  )
}
