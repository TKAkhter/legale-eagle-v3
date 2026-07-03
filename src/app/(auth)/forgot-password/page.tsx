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
    catch { setError('Failed to send reset email') }
  }
  if (sent) return <Alert severity="success">Reset link sent! Check your email.</Alert>
  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>Enter your email to receive a password reset link.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledInput name="email" control={control} label="Email Address" type="email" required />
      <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
      </Button>
      <Link to="/login" style={{color:"#4f46e5",textAlign:"center",display:"block"}}>Back to sign in</Link>
    </form>
  )
}
