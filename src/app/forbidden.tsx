import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', p:4, bgcolor:'background.default' }}>
      <Box sx={{ textAlign:'center' }}>
        <Typography variant="h1" sx={{ fontWeight:800, fontSize:{xs:'6rem',sm:'8rem'}, color:'warning.main', lineHeight:1 }}>403</Typography>
        <LockOutlinedIcon sx={{ fontSize:56, color:'text.disabled', my:2 }} />
        <Typography variant="h5" sx={{ fontWeight:600, mb:1 }}>Access Denied</Typography>
        <Typography color="text.secondary" sx={{ mb:3 }}>You don't have permission to view this page. Contact your administrator.</Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </Box>
    </Box>
  )
}
