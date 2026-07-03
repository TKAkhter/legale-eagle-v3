import { Box, Paper, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
export function AuthLayout() {
  return (
    <Box sx={{ p: 2, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
      <Paper elevation={0} variant="outlined" sx={{width:'100%',maxWidth:440,p:4,borderRadius:3}}>
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>LegalEagle</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Legal Firm Management</Typography>
        </Box>
        <Outlet/>
      </Paper>
    </Box>
  )
}
