/**
 * Profile — personal account, preferences, and password.
 * Loads via GET /user/get/by/id (LMS parity); email & phone are read-only.
 */
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Box, Paper, Typography, Avatar, Button, Alert,
  CircularProgress, Chip, Divider, TextField,
} from "@mui/material"
import CameraAltIcon from "@mui/icons-material/CameraAlt"
import LockIcon from "@mui/icons-material/Lock"
import PersonIcon from "@mui/icons-material/Person"
import TuneIcon from "@mui/icons-material/Tune"
import SaveIcon from "@mui/icons-material/Save"
import BusinessIcon from "@mui/icons-material/BusinessOutlined"
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined"
import { useAuthStore } from "@lib/store/authStore"
import { useThemeStore } from "@lib/store/themeStore"
import { authApi } from "@/api/auth"
import { toast } from "@/lib/toast"
import { PageShell } from "@/components/ui/PageShell"
import { LanguageFlagButtons } from "@/components/layout/LanguageSwitcher"
import { ControlledInput } from "@components/forms/ControlledInput"
import { formatDateTime } from "@lib/utils/formatDate"
import type { AuthUser } from "@/types/auth.types"
import { SECTION_GAP } from "@/config/spacing"

const pwSchema = z.object({
  oldPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
})
type PwForm = z.infer<typeof pwSchema>

interface PracticeArea {
  id: string
  name: string
  status?: boolean
}

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  userName?: string
  profilePic?: string
  companyUserType?: string
  accessPermission?: string
  practiceAreas: PracticeArea[]
  practiceAreaIds: string[]
  departmentName?: string
  designationName?: string
  roles: string[]
  emailVerified?: boolean
  active?: boolean
  hod?: boolean
  lastLoginTime?: string
  createdAt?: string
  companyName?: string
  companyCurrency?: string
  companyTimeZone?: string
  companyAddress?: string
  rate?: number
}

function CardHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <Box sx={{
      px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>
      </Box>
      {action}
    </Box>
  )
}

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
        {value?.trim() ? value : "—"}
      </Typography>
    </Box>
  )
}

function roleLabel(role: string) {
  return role.replace(/^ROLE_/, "").replace(/_/g, " ")
}

export default function ProfilePage() {
  const storeUser = useAuthStore(s => s.user)
  const setAuth = useAuthStore(s => s.setAuth)
  const accessToken = useAuthStore(s => s.accessToken)
  const accessScope = useAuthStore(s => s.accessScope)
  const colorMode = useThemeStore(s => s.colorMode)
  const toggleMode = useThemeStore(s => s.toggleColorMode)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [pwError, setPwError] = useState("")
  const [showAllAreas, setShowAllAreas] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!storeUser?.id) { setLoading(false); return }
      try {
        const raw = await authApi.getProfile(storeUser.id)
        if (cancelled) return
        const areas = Array.isArray(raw.practiceAreas)
          ? (raw.practiceAreas as { id?: string; name?: string; status?: boolean }[]).map(a => ({
              id: String(a.id ?? ""),
              name: String(a.name ?? ""),
              status: a.status !== false,
            })).filter(a => a.name)
          : []
        const rolesRaw = Array.isArray(raw.role) ? raw.role as { roleName?: string }[] : []
        const company = raw.company as Record<string, unknown> | undefined
        const designation = raw.designation as { name?: string } | undefined
        const department = raw.department as { name?: string } | undefined
        const rate = raw.rate as { parsedValue?: number; source?: string } | undefined

        const next: ProfileData = {
          id: String(raw.id ?? storeUser.id),
          firstName: String(raw.firstName ?? storeUser.firstName ?? ""),
          lastName: String(raw.lastName ?? storeUser.lastName ?? ""),
          email: String(raw.email ?? storeUser.email ?? ""),
          phone: String(raw.phone ?? storeUser.phone ?? ""),
          userName: String(raw.userName ?? raw.email ?? ""),
          profilePic: (raw.profilePic as string | undefined) ?? storeUser.profilePic,
          companyUserType: String(raw.companyUserType ?? storeUser.companyUserType ?? ""),
          accessPermission: raw.accessPermission as string | undefined,
          practiceAreas: areas,
          practiceAreaIds: Array.isArray(raw.practiceAreaIds)
            ? (raw.practiceAreaIds as unknown[]).map(String)
            : areas.map(a => a.id),
          departmentName: department?.name ?? storeUser.department?.name,
          designationName: designation?.name,
          roles: rolesRaw.map(r => String(r.roleName ?? "")).filter(Boolean),
          emailVerified: Boolean(raw.emailVarified ?? raw.emailVerified),
          active: raw.active !== false,
          hod: Boolean(raw.hod),
          lastLoginTime: raw.lastLoginTime ? String(raw.lastLoginTime).replace(" ", "T") : undefined,
          createdAt: raw.createdAt ? String(raw.createdAt).replace(" ", "T") : undefined,
          companyName: company?.companyName ? String(company.companyName) : undefined,
          companyCurrency: company?.currency ? String(company.currency) : undefined,
          companyTimeZone: company?.timeZone ? String(company.timeZone) : undefined,
          companyAddress: company?.address ? String(company.address) : undefined,
          rate: typeof rate?.parsedValue === "number" ? rate.parsedValue : undefined,
        }
        setProfile(next)
        setFirstName(next.firstName)
        setLastName(next.lastName)
        setAvatarUrl(next.profilePic ?? null)
      } catch {
        setProfile({
          id: storeUser.id,
          firstName: storeUser.firstName,
          lastName: storeUser.lastName,
          email: storeUser.email,
          phone: storeUser.phone ?? "",
          profilePic: storeUser.profilePic,
          companyUserType: storeUser.companyUserType,
          practiceAreas: storeUser.practiceAreas ?? [],
          practiceAreaIds: storeUser.practiceAreaIds ?? [],
          departmentName: storeUser.department?.name,
          roles: [],
        })
        setFirstName(storeUser.firstName)
        setLastName(storeUser.lastName)
        setAvatarUrl(storeUser.profilePic ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [storeUser])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const reader = new FileReader()
    reader.onload = ev => setAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    setUploadingAvatar(true)
    try {
      const url = await authApi.uploadAvatar(file, profile.id)
      if (url) setAvatarUrl(url)
      toast.success("Avatar updated")
    } catch {
      toast.error("Avatar upload failed")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSaveProfile() {
    if (!profile) return
    if (!firstName.trim()) { toast.error("First name is required"); return }
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile(profile.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: profile.email,
        phone: profile.phone,
        accessPermission: profile.accessPermission,
        companyUserType: profile.companyUserType,
        practiceAreaIds: profile.practiceAreaIds,
      })
      const mergedFirst = String(updated.firstName ?? firstName.trim())
      const mergedLast = String(updated.lastName ?? lastName.trim())
      setFirstName(mergedFirst)
      setLastName(mergedLast)
      setProfile(p => p ? { ...p, firstName: mergedFirst, lastName: mergedLast } : p)
      if (storeUser && accessToken) {
        setAuth({
          user: {
            ...storeUser,
            firstName: mergedFirst,
            lastName: mergedLast,
            profilePic: avatarUrl ?? storeUser.profilePic,
          } as AuthUser,
          accessToken,
          accessScope: accessScope ?? storeUser.accessScope,
        })
      }
      toast.success("Profile saved")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  async function onChangePassword(vals: PwForm) {
    setPwError("")
    try {
      await authApi.changePassword(vals.oldPassword, vals.newPassword, vals.confirmPassword)
      toast.success("Password changed successfully")
      reset()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.message
        ?? (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? "Failed to change password"
      setPwError(msg)
      toast.error(msg)
    }
  }

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()
  const activeAreas = (profile?.practiceAreas ?? []).filter(a => a.status !== false)
  const visibleAreas = showAllAreas ? activeAreas : activeAreas.slice(0, 12)

  if (loading) {
    return (
      <PageShell title="Profile" description="Manage your account and preferences">
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      </PageShell>
    )
  }

  return (
    <PageShell title="Profile" description="Manage your account and preferences">
      <Box sx={{ display: "flex", flexDirection: "column", gap: SECTION_GAP, width: "100%", maxWidth: 1100 }}>

        {/* Identity header */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            p: { xs: 2.5, sm: 3 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "flex-start" },
            gap: 2.5,
            background: (t) =>
              t.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(15,60,110,0.35) 0%, transparent 70%)"
                : "linear-gradient(135deg, rgba(15,60,110,0.06) 0%, transparent 70%)",
          }}
        >
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{ width: 88, height: 88, fontSize: 28, bgcolor: "primary.main", fontWeight: 700 }}
            >
              {!avatarUrl && initials}
            </Avatar>
            {uploadingAvatar ? (
              <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress size={24} sx={{ color: "white" }} />
              </Box>
            ) : (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, "&:hover": { opacity: 1 }, transition: "opacity 200ms", cursor: "pointer",
                }}
              >
                <CameraAltIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.01em", mb: 0.25 }}>
              {firstName} {lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              {profile?.email}
              {profile?.userName && profile.userName !== profile.email ? ` · ${profile.userName}` : ""}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: { xs: "center", sm: "flex-start" } }}>
              {profile?.active !== false && <Chip size="small" label="Active" color="success" variant="outlined" />}
              {profile?.emailVerified && (
                <Chip size="small" icon={<VerifiedIcon sx={{ fontSize: "14px !important" }} />} label="Email verified" variant="outlined" />
              )}
              {profile?.companyUserType && (
                <Chip size="small" label={profile.companyUserType} color="primary" variant="outlined" />
              )}
              {profile?.designationName && <Chip size="small" label={profile.designationName} variant="outlined" />}
              {profile?.departmentName && <Chip size="small" label={profile.departmentName} variant="outlined" />}
              {profile?.hod && <Chip size="small" label="HOD" color="primary" />}
              {profile?.roles.map(r => (
                <Chip key={r} size="small" label={roleLabel(r)} variant="outlined" />
              ))}
            </Box>
            {profile?.companyName && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.5, justifyContent: { xs: "center", sm: "flex-start" } }}>
                <BusinessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {profile.companyName}
                  {profile.companyAddress ? ` · ${profile.companyAddress}` : ""}
                  {profile.companyCurrency ? ` · ${profile.companyCurrency}` : ""}
                  {profile.companyTimeZone ? ` · ${profile.companyTimeZone}` : ""}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Account — full width */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <CardHeader
            icon={<PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
            title="Account Information"
            action={
              <Button
                variant="contained"
                size="small"
                startIcon={savingProfile ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving…" : "Save"}
              </Button>
            }
          />
          <Box sx={{ p: { xs: 2.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="First Name" size="small" value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth required />
              <TextField label="Last Name" size="small" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
              <TextField
                label="Email"
                size="small"
                value={profile?.email ?? ""}
                disabled
                fullWidth
                helperText="Contact your administrator to change your email"
              />
              <TextField
                label="Phone"
                size="small"
                value={profile?.phone ?? ""}
                disabled
                fullWidth
                helperText="Contact your administrator to change your phone number"
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Details</Typography>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                gap: 2.5,
              }}>
                <InfoCell label="User type" value={profile?.companyUserType} />
                <InfoCell label="Designation" value={profile?.designationName} />
                <InfoCell label="Department" value={profile?.departmentName} />
                <InfoCell label="Roles" value={profile?.roles.map(roleLabel).join(", ") || undefined} />
                <InfoCell label="Last login" value={profile?.lastLoginTime ? formatDateTime(profile.lastLoginTime) : undefined} />
                <InfoCell label="Member since" value={profile?.createdAt ? formatDateTime(profile.createdAt) : undefined} />
                <InfoCell label="Billing rate" value={profile?.rate != null ? `${profile.rate}` : undefined} />
                <InfoCell label="Username" value={profile?.userName} />
              </Box>
            </Box>

            <Divider />

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Practice Areas
                  {activeAreas.length > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                      {activeAreas.length}
                    </Typography>
                  )}
                </Typography>
                {activeAreas.length > 12 && (
                  <Button size="small" onClick={() => setShowAllAreas(v => !v)}>
                    {showAllAreas ? "Show less" : `Show all (${activeAreas.length})`}
                  </Button>
                )}
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {visibleAreas.length > 0
                  ? visibleAreas.map(a => (
                      <Chip key={a.id || a.name} size="small" label={a.name} variant="outlined" />
                    ))
                  : <Typography variant="body2" color="text.secondary">None assigned</Typography>}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Preferences + Password — same row */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: SECTION_GAP,
          alignItems: "stretch",
        }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CardHeader
              icon={<TuneIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
              title="Preferences"
            />
            <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Theme</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {(["light", "dark"] as const).map(m => (
                    <Button
                      key={m}
                      size="small"
                      variant={colorMode === m ? "contained" : "outlined"}
                      onClick={() => colorMode !== m && toggleMode()}
                    >
                      {m === "light" ? "Light" : "Dark"}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Language</Typography>
                <LanguageFlagButtons />
              </Box>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CardHeader
              icon={<LockIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
              title="Change Password"
            />
            <Box
              component="form"
              onSubmit={handleSubmit(onChangePassword)}
              sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
            >
              {pwError && <Alert severity="error" onClose={() => setPwError("")}>{pwError}</Alert>}
              <ControlledInput name="oldPassword" control={control} label="Current Password" type="password" required />
              <ControlledInput name="newPassword" control={control} label="New Password" type="password" required />
              <ControlledInput name="confirmPassword" control={control} label="Confirm New Password" type="password" required />
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: "flex-start", mt: "auto" }}>
                {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Update Password"}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </PageShell>
  )
}
