import { Box, Typography, Alert } from '@mui/material'
import { Link } from 'react-router-dom'
import { featureFlags } from '@config/featureFlags'

export default function RegisterPage() {
  if (!featureFlags.enableUserRegistration) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="info">
          Self-registration is not available. Please contact your administrator to create an account.
        </Alert>
        <Link to="/login" style={{ textAlign: 'center' }}>
          <Typography variant="body2" color="primary">Back to sign in</Typography>
        </Link>
      </Box>
    )
  }
  // Full registration form — enabled when VITE_ENABLE_USER_REGISTRATION=true
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">Registration form coming soon.</Typography>
    </Box>
  )
}
