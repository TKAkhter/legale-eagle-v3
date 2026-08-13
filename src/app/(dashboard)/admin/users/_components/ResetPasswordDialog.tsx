import { env } from '@/config/env'
import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Box, CircularProgress } from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { axiosClient } from '@lib/api/axios'
import { ControlledInput } from '@components/forms/ControlledInput'

const schema = z.object({
  password:        z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; userId: string; userName: string }

export function ResetPasswordDialog({ open, onClose, userId, userName }: Props) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit({ password }: Form) {
    setError('')
    try {
      if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 400)) }
      if (!env.USE_STATIC_DATA) await axiosClient.post('/api/user/change/password/admin', { userId, password })
      setSuccess(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to reset password')
    }
  }

  function handleClose() { reset(); setError(''); setSuccess(false); onClose() }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success">Password reset successfully for {userName}.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <ControlledInput name="password"        control={control} label="New Password"     type="password" required />
            <ControlledInput name="confirmPassword" control={control} label="Confirm Password" type="password" required />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>{success ? 'Close' : 'Cancel'}</Button>
        {!success && (
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Reset Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
