"use client"
import { useState } from "react"
import { useNavigate, Link as RouterLink } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Button, Alert, CircularProgress, Typography, Divider, Link } from "@mui/material"
import WindowIcon from "@mui/icons-material/Window"
import { env } from "@/config/env"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@lib/store/authStore"
import { ControlledInput } from "@/components/forms/ControlledInput"

const schema = z.object({
  username: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useAuthStore((s) => s.setAuth)
  const [error, setError]       = useState("")
  const [ssoLoading, setSsoLoading] = useState(false)

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: env.USE_STATIC_DATA ? "admin@legaleagle.com" : "",
      password: env.USE_STATIC_DATA ? "password" : "",
    },
  })

  async function onSubmit({ username, password }: Form) {
    setError("")
    try {
      const signinData = await authApi.signin(username, password)
      const token = String(signinData.token ?? '')
      const [menu, groups] = await Promise.all([
        authApi.getMenu(token),
        authApi.getGroups(token),
      ])
      login({
        user: {
          id: String(signinData.id ?? ''), firstName: String(signinData.firstName ?? ''),
          lastName: String(signinData.lastName ?? ''), email: String(signinData.email ?? ''),
          phone: signinData.phone as string | undefined,
          companyUserType: "ATTORNEY" as "ATTORNEY" | "ADMIN",
          accessScope: String(signinData.accessScope ?? ''),
          token, active: true, hod: false, backEntry: false,
          department: signinData.department as undefined,
        },
        accessToken: token,
        accessScope: String(signinData.accessScope ?? ''),
        refreshToken: undefined,
      })
      // Resolve permissions from menu and store
      const { resolvePermissions } = await import("@lib/auth/permissions")
      const permissions = resolvePermissions(menu as import("@/types/auth.types").ApiMenuItem[], groups as import("@/types/auth.types").ApiUserGroup[])
      useAuthStore.getState().setMenuItems(menu as import("@/types/auth.types").ApiMenuItem[], permissions)
      navigate("/dashboard", { replace: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? "Invalid email or password. Please try again.")
    }
  }

  async function handleSSO() {
    if (!env.AZURE_CLIENT_ID) {
      setError("Microsoft SSO requires AZURE_CLIENT_ID to be configured.")
      return
    }
    setSsoLoading(true)
    try {
      const { msalLogin } = await import("@/lib/auth/msal")
      await msalLogin()
      navigate("/dashboard", { replace: true })
    } catch {
      setError("Microsoft sign-in failed. Please try email login.")
    } finally {
      setSsoLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}>
        Welcome back
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sign in to your LegalEagle account
      </Typography>

      {env.USE_STATIC_DATA && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
          <strong>Static mode</strong> — use <code>admin@legaleagle.com</code> / <code>password</code>
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {!env.FORCE_MS_SSO && (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <ControlledInput name="username" control={control} label="Email address" type="email" required />
          <Box>
            <ControlledInput name="password" control={control} label="Password" type="password" required />
            <Box sx={{ textAlign: "right", mt: 0.75 }}>
              <Link component={RouterLink} to="/forgot-password"
                sx={{ fontSize: 12, color: "secondary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                Forgot password?
              </Link>
            </Box>
          </Box>
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth sx={{ mt: 0.5 }}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Sign in"}
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 2.5 }}>
        <Typography variant="caption" color="text.disabled">or continue with</Typography>
      </Divider>
      <Button variant="outlined" size="large" fullWidth disabled={ssoLoading}
        startIcon={ssoLoading ? <CircularProgress size={16} /> : <WindowIcon />}
        onClick={handleSSO}
        sx={{ color: "text.primary", borderColor: "divider", "&:hover": { borderColor: "primary.main" } }}>
        Microsoft
      </Button>

      {env.ENABLE_REGISTER && (
        <Typography variant="body2" sx={{ textAlign: "center", mt: 3, color: "text.secondary" }}>
          Don't have an account?{" "}
          <Link component={RouterLink} to="/register"
            sx={{ color: "primary.main", fontWeight: 500, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
            Request access
          </Link>
        </Typography>
      )}
    </Box>
  )
}
