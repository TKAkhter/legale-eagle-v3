/**
 * Settings page — tabbed settings panel.
 *
 * Tabs:
 *   0. My Profile    — view profile (redirect to /profile for editing)
 *   1. Company       — edit company settings (name, currency, tax, etc.)
 *   2. Appearance    — dark mode + language toggles
 *   3. Practice Areas, Lead Sources, Departments, Designations — LookupManagers
 *   4. System Info   — env flags for debugging
 *
 * Static data mode: company form submits locally (no API call).
 * Real mode: saves to /api/company/update.
 */
import { useState } from "react"
import {
  Box, Typography, Paper, Divider, Switch, FormControlLabel,
  Tabs as MuiTabs, Tab, TextField, Button, Grid, Alert,
  CircularProgress, Chip, Avatar,
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import { useThemeStore }  from "@lib/store/themeStore"
import { useAuthStore }   from "@lib/store/authStore"
import { axiosClient }    from "@lib/api/axios"
import { env }            from "@/config/env"
import { logger }         from "@/lib/logger"
import { toast }          from "@/lib/toast"
import { PageShell }      from "@/components/ui/PageShell"
import { LookupManager }  from "./_components/LookupManager"

interface CompanyForm {
  companyName: string
  address:     string
  phone:       string
  email:       string
  currency:    string
  tax:         number
  taxName:     string
  invoicePrefix:string
  dueDate:     number
  timeZone:    string
}

function CompanyTab({ user }: { user: { company?: Record<string,unknown> } | null }) {
  const company = user?.company as Record<string,unknown> | undefined
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, formState: { isDirty } } = useForm<CompanyForm>({
    defaultValues: {
      companyName:   String(company?.companyName ?? ""),
      address:       String(company?.address ?? ""),
      phone:         String(company?.phone ?? ""),
      email:         String(company?.email ?? ""),
      currency:      String(company?.currency ?? "AED"),
      tax:           Number(company?.tax ?? 5),
      taxName:       String(company?.taxName ?? "VAT"),
      invoicePrefix: String(company?.invoicePrefix ?? "INV"),
      dueDate:       Number(company?.dueDate ?? 30),
      timeZone:      String(company?.timeZone ?? "GMT+04:00"),
    },
  })

  async function onSubmit(data: CompanyForm) {
    setSaving(true)
    logger.info("SettingsPage", "Saving company settings", data)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.put("/api/company/update", data)
      } else {
        await new Promise(r => setTimeout(r, 500))  // simulate save
      }
      toast.success("Company settings saved")
    } catch (e) {
      logger.error("SettingsPage", "Failed to save company settings", e)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const field = (name: keyof CompanyForm, label: string, opts?: { type?: string; required?: boolean }) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f }) => (
        <TextField
          {...f}
          label={label}
          size="small"
          fullWidth
          type={opts?.type ?? "text"}
          required={opts?.required}
          value={f.value ?? ""}
        />
      )}
    />
  )

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {field("companyName",   "Company Name",    { required: true })}
        {field("email",         "Email",           { type: "email" })}
        {field("phone",         "Phone")}
        {field("address",       "Address")}
        {field("currency",      "Currency")}
        {field("timeZone",      "Time Zone")}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Billing Settings</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 2.5 }}>
        {field("invoicePrefix", "Invoice Prefix")}
        {field("taxName",       "Tax Name")}
        {field("tax",           "Tax Rate (%)",    { type: "number" })}
        {field("dueDate",       "Payment Due (days)", { type: "number" })}
      </Box>
      <Button
        type="submit"
        variant="contained"
        disabled={saving || !isDirty}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </Box>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const colorMode      = useThemeStore(s => s.colorMode)
  const toggleColorMode= useThemeStore(s => s.toggleColorMode)
  const toggleLanguage = useThemeStore(s => s.toggleLanguage)
  const language       = useThemeStore(s => s.language)
  const user           = useAuthStore(s => s.user) as Record<string,unknown> | null

  const TABS = [
    "My Profile", "Company", "Appearance",
    "Practice Areas", "Lead Sources", "Departments", "Designations", "Session Rates",
    "System Info",
  ]

  return (
    <PageShell title="Settings" description="Manage firm-wide settings and preferences">
      <MuiTabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {TABS.map(t => <Tab key={t} label={t} sx={{ textTransform: "none", fontWeight: 500 }} />)}
      </MuiTabs>

      {/* My Profile */}
      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 20 }}>
              {String(user?.firstName ?? "")[0]}{String(user?.lastName ?? "")[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {String(user?.firstName ?? "")} {String(user?.lastName ?? "")}
              </Typography>
              <Typography variant="body2" color="text.secondary">{String(user?.email ?? "")}</Typography>
              <Chip size="small" label={String(user?.companyUserType ?? "ATTORNEY")} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Alert severity="info">
            To edit your profile or change your password, go to the{" "}
            <strong>Profile & Settings</strong> page from the top-right menu.
          </Alert>
        </Paper>
      )}

      {/* Company */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Company Settings</Typography>
          <CompanyTab user={user as { company?: Record<string,unknown> } | null} />
        </Paper>
      )}

      {/* Appearance */}
      {tab === 2 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Appearance</Typography>
          <FormControlLabel
            control={<Switch checked={colorMode === "dark"} onChange={toggleColorMode} />}
            label="Dark mode"
          />
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={<Switch checked={language === "ar"} onChange={toggleLanguage} />}
            label="Arabic / العربية (RTL)"
          />
        </Paper>
      )}

      {/* Lookup managers */}
      {tab === 3 && <LookupManager title="Practice Areas" getUrl="/api/practice-area/get" addUrl="/api/practice-area/add" deleteUrl="/api/practice-area/delete" nameField="name" queryKey="practiceAreas" />}
      {tab === 4 && <LookupManager title="Lead Sources"   getUrl="/api/lead-source/get"   addUrl="/api/lead-source/add"   deleteUrl="/api/lead-source/delete"   nameField="name" queryKey="leadSources"   />}
      {tab === 5 && <LookupManager title="Departments"    getUrl="/api/util/list/department" addUrl="/api/department/add"  deleteUrl="/api/department/delete"    nameField="name" queryKey="departments"   />}
      {tab === 6 && <LookupManager title="Designations"   getUrl="/api/util/get/designation" addUrl="/api/designation/add" deleteUrl="/api/designation/delete"   nameField="name" queryKey="designations"  />}
      {tab === 7 && <LookupManager title="Session Rates"  getUrl="/api/session-rate/get"  addUrl="/api/session-rate/add"  deleteUrl="/api/session-rate/delete"  nameField="name" queryKey="sessionRates"  />}

      {/* System Info */}
      {tab === 8 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>System Info</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {[
              ["API URL",           import.meta.env["VITE_API_BASE_URL"] || "(not set)"],
              ["Environment",       import.meta.env["VITE_APP_ENV"] || "development"],
              ["Data Mode",         env.USE_STATIC_DATA ? "Static (no backend)" : "Live API"],
              ["Dynamic Nav",       env.DYNAMIC_NAV ? "On (API-driven)" : "Off (static)"],
              ["Logs",              env.ENABLE_LOGS ? "Enabled" : "Disabled"],
              ["Microsoft SSO",     env.FORCE_MS_SSO ? "Forced" : "Optional"],
              ["User Registration", env.ENABLE_REGISTER ? "Enabled" : "Disabled"],
              ["Azure Client ID",   env.AZURE_CLIENT_ID || "(not set)"],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: "flex", gap: 2, alignItems: "baseline" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: "text.secondary", flexShrink: 0 }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 13 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </PageShell>
  )
}
