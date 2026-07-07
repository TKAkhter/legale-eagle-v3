import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Button, Alert, CircularProgress, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { axiosClient } from '@lib/api/axios'
import { ControlledInput } from '@components/forms/ControlledInput'

const schema = z.object({ email: z.string().email('Invalid email') })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit({ email }: Form) {
    try { await axiosClient.post('/api/auth/reset/password', { username: email }); setSent(true) }
    catch { setError('Failed to send reset email. Please try again.') }
  }

  if (sent) return (
    <Box>
      <Alert severity="success" sx={{ mb: 2 }}>Reset link sent! Check your email inbox.</Alert>
      <Link to="/login" style={{ fontSize: 14, color: '#0F3C6E' }}>← Back to sign in</Link>
    </Box>
  )

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.75 }}>Forgot password</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Enter your email and we'll send you a reset link.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ControlledInput name="email" control={control} label="Email address" type="email" required />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send reset link'}
        </Button>
      </Box>
      <Box sx={{ mt: 2.5, textAlign: 'center' }}>
        <Link to="/login" style={{ fontSize: 14, color: '#0F3C6E' }}>← Back to sign in</Link>
      </Box>
    </Box>
  )
}
