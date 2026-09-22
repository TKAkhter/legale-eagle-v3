import { useTranslation } from 'react-i18next'
/**
 * Profile & Settings page.
 *
 * Features:
 *   - Editable first + last name with save to API
 *   - Avatar upload (POST multipart to /api/user/avatar)
 *   - Theme toggle (light/dark)
 *   - Language toggle (EN/AR)
 *   - Change password form
 */
import React, { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Box, Paper, Typography, Avatar, Button, Alert,
  CircularProgress, Chip, Divider, TextField,
} from "@mui/material"
import CameraAltIcon from "@mui/icons-material/CameraAlt"
import LockIcon      from "@mui/icons-material/Lock"
import PersonIcon    from "@mui/icons-material/Person"
import SaveIcon      from "@mui/icons-material/Save"
import { useAuthStore }  from "@/lib/store/authStore"
import { useThemeStore } from "@/lib/store/themeStore"
import { authApi }       from "@/api/auth"
import { toast }         from "@/lib/toast"
import { PageShell }     from "@/components/ui/PageShell"
import { ControlledInput } from "@/components/forms/ControlledInput"

const pwSchema = z.object({
  oldPassword:     z.string().min(1, "Required"),
  newPassword:     z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
})
type PwForm = z.infer<typeof pwSchema>

export default function ProfilePage() {
  const { t } = useTranslation()
  const user       = useAuthStore(s => (s as { user?: { firstName?: string; lastName?: string; email?: string; companyUserType?: string; department?: { name: string }; profilePic?: string } }).user)
  const colorMode  = useThemeStore(s => s.colorMode)
  const toggleMode = useThemeStore(s => s.toggleColorMode)
  const language   = useThemeStore(s => s.language)
  const setLang    = useThemeStore(s => s.setLanguage)

  // Avatar state
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(user?.profilePic ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editable name state
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName,  setLastName]  = useState(user?.lastName  ?? "")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [pwError, setPwError] = useState("")
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  })

  // ── Avatar upload ────────────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Preview immediately
    const reader = new FileReader()
    reader.onload = ev => setAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    // Upload to server
    setUploadingAvatar(true)
    try {
      const url = await authApi.uploadAvatar(file)
      if (url) setAvatarUrl(url)
      toast.success("Avatar updated")
    } catch {
      toast.error("Avatar upload failed")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Save profile ─────────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    if (!firstName.trim()) { toast.error("First name is required"); return }
    setSavingProfile(true)
    try {
      await authApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
      // Update store so header initials/name reflect change immediately
      // Update store with new name — rebuild full user object from existing state
      const store = useAuthStore.getState()
      if (user && store.accessToken) {
        store.setAuth({
          user:         { ...user, firstName: firstName.trim(), lastName: lastName.trim() } as import("@/types/auth.types").AuthUser,
          accessToken:  store.accessToken,
          accessScope:  store.accessScope,
        })
      }
      toast.success("Profile saved")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Change password ──────────────────────────────────────────────────────────
  async function onChangePassword(vals: PwForm) {
    setPwError("")
    try {
      await authApi.changePassword(vals.oldPassword, vals.newPassword, vals.confirmPassword)
      toast.success("Password changed successfully")
      reset()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to change password"
      setPwError(msg); toast.error(msg)
    }
  }

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()

  return (
    <PageShell title={t("settings.profile", "Profile & Settings")} description="Manage your account and preferences">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, maxWidth: 900 }}>

        {/* ── Account Information ── */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>Account Information</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
            {/* Avatar with upload overlay */}
            <Box sx={{ position: "relative", display: "inline-block" }}>
              <Avatar
                src={avatarUrl ?? undefined}
                sx={{ width: 80, height: 80, fontSize: 26, bgcolor: "primary.main" }}
              >
                {!avatarUrl && initials}
              </Avatar>
              {uploadingAvatar && (
                <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CircularProgress size={24} sx={{ color: "white" }} />
                </Box>
              )}
              {!uploadingAvatar && (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, "&:hover": { opacity: 1 }, transition: "opacity 200ms", cursor: "pointer" }}
                >
                  <CameraAltIcon sx={{ color: "white", fontSize: 24 }} />
                </Box>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, mt: -1.5 }}>
              Click to change photo
            </Typography>

            {/* Editable name fields */}
            <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                <TextField
                  label="First Name"
                  size="small"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  size="small"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  fullWidth
                />
              </Box>
              <TextField
                label="Email"
                size="small"
                value={user?.email ?? ""}
                disabled
                fullWidth
                helperText="Contact your administrator to change your email"
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={user?.companyUserType ?? "ATTORNEY"} color="primary" variant="outlined" />
                {user?.department && <Chip size="small" label={user.department.name} variant="outlined" />}
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={savingProfile ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
                onClick={handleSaveProfile}
                disabled={savingProfile}
                sx={{ alignSelf: "flex-start" }}
              >
                {savingProfile ? "Saving…" : "Save Profile"}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ── Preferences ── */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>Preferences</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Theme</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["light", "dark"] as const).map(m => (
                  <Button key={m} size="small"
                    variant={colorMode === m ? "contained" : "outlined"}
                    onClick={() => colorMode !== m && toggleMode()}
                  >
                    {m === "light" ? "☀️ Light" : "🌙 Dark"}
                  </Button>
                ))}
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Language</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {([["en", "🇬🇧 English"], ["ar", "🇦🇪 العربية"]] as const).map(([code, label]) => (
                  <Button key={code} size="small"
                    variant={language === code ? "contained" : "outlined"}
                    onClick={() => setLang(code)}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* ── Change Password ── */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", gridColumn: { md: "span 2" } }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
            <LockIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>Change Password</Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit(onChangePassword)}
            sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
            {pwError && <Alert severity="error" onClose={() => setPwError("")}>{pwError}</Alert>}
            <ControlledInput name="oldPassword"     control={control} label="Current Password"    type="password" required />
            <ControlledInput name="newPassword"     control={control} label="New Password"         type="password" required />
            <ControlledInput name="confirmPassword" control={control} label="Confirm New Password" type="password" required />
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: "flex-start" }}>
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Update Password"}
            </Button>
          </Box>
        </Paper>

      </Box>
    </PageShell>
  )
}
