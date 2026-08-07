import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Button, Alert, CircularProgress, Typography, Link } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { authApi } from "@/api/auth"
import { ControlledInput } from "@/components/forms/ControlledInput"

const schema = z.object({ email: z.string().email("Please enter a valid email address") })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState("")
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit({ email }: Form) {
    setError("")
    try { await authApi.resetPassword(email); setSent(true) }
    catch { setError("Failed to send reset email. Please check the address and try again.") }
  }

  if (sent) return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}>Check your email</Typography>
      <Alert severity="success" sx={{ mb: 2.5 }}>A password reset link has been sent. Check your inbox and spam folder.</Alert>
      <Link component={RouterLink} to="/login" sx={{ fontSize: 14, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
        ← Back to sign in
      </Link>
    </Box>
  )

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}>Forgot password?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Enter your email and we'll send you a reset link.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ControlledInput name="email" control={control} label="Email address" type="email" required />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Send reset link"}
        </Button>
      </Box>
      <Box sx={{ mt: 2.5, textAlign: "center" }}>
        <Link component={RouterLink} to="/login" sx={{ fontSize: 14, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
          ← Back to sign in
        </Link>
      </Box>
    </Box>
  )
}
