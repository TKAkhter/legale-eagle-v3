import { Box, Paper, Typography, Divider } from '@mui/material'
import { Outlet } from 'react-router-dom'
import GavelIcon from '@mui/icons-material/Gavel'

export function AuthLayout() {
  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      bgcolor: '#F6F8FA',
    }}>
      {/* Left branding panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        width: 420,
        flexShrink: 0,
        bgcolor: '#0F2744',
        px: 6,
        py: 8,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -120, right: -120,
          width: 400, height: 400,
          borderRadius: '50%',
          bgcolor: 'rgba(0,180,166,0.08)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -80, left: -80,
          width: 300, height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(0,180,166,0.06)',
        },
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <GavelIcon sx={{ fontSize: 32, color: '#00B4A6' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              LegalEagle
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff', mb: 2, lineHeight: 1.2 }}>
            Legal Firm Management
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.7 }}>
            Manage matters, clients, billing, and team workflows — all in one place.
          </Typography>
          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['Complete client & matter management','Time tracking & billing automation','Role-based access control'].map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00B4A6', flexShrink: 0 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo only */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 4 }}>
            <GavelIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>LegalEagle</Typography>
          </Box>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
