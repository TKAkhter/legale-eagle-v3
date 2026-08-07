import { Box, Alert, Typography, Link } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { env } from "@/config/env"

export default function RegisterPage() {
  if (!env.ENABLE_REGISTER) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}>Create account</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>New accounts are created by administrators.</Typography>
        <Alert severity="info" sx={{ mb: 2.5 }}>Please contact your firm administrator to get access.</Alert>
        <Link component={RouterLink} to="/login" sx={{ fontSize: 14, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
          ← Back to sign in
        </Link>
      </Box>
    )
  }
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>Create account</Typography>
      <Alert severity="info">Registration form coming soon.</Alert>
    </Box>
  )
}
