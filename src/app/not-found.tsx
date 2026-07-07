import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', p:4, bgcolor:'background.default' }}>
      <Box sx={{ textAlign:'center' }}>
        <Typography variant="h1" sx={{ fontWeight:800, fontSize:{xs:'6rem',sm:'8rem'}, color:'primary.main', lineHeight:1 }}>404</Typography>
        <SentimentDissatisfiedIcon sx={{ fontSize:56, color:'text.disabled', my:2 }} />
        <Typography variant="h5" sx={{ fontWeight:600, mb:1 }}>Page not found</Typography>
        <Typography color="text.secondary" sx={{ mb:3 }}>The page you're looking for doesn't exist or has been moved.</Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </Box>
    </Box>
  )
}
