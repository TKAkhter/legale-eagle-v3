/**
 * Company Info settings — LMS /company-info parity
 * (fields + logo upload + favourite-clients + auto-logout toggles).
 */
import { useEffect, useRef, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Avatar, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, MenuItem, Paper,
  Switch, TextField, Typography,
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import { PageShell } from "@/components/ui/PageShell"
import { adminApi } from "@/api/admin"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

interface CompanyForm {
  companyName: string
  companySize: string
  dateFormatAllow: string
  address: string
  phone: string
  email: string
  currency: string
  tax: number
  taxName: string
  taxNumber: string
  invoicePrefix: string
  dueDate: number
  timeZone: string
  matterSeq: string
  lfaSeq: string
  proformaSeq: string
  taxInvoiceSeq: string
  enforcementSeq: string
  enforcementInvoicePrefix: string
  creditNoteSeq: string
  creditNoteInvoicePrefix: string
  writeOffSeq: string
  writeOffInvoicePrefix: string
}

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]

export default function CompanySettingsPage() {
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [favActive, setFavActive] = useState(false)
  const [favLimit, setFavLimit] = useState(false)
  const [maxFav, setMaxFav] = useState(5)
  const [autoLogout, setAutoLogout] = useState(false)
  const [autoLogoutMin, setAutoLogoutMin] = useState(30)
  const [favDialog, setFavDialog] = useState(false)
  const [logoutDialog, setLogoutDialog] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [favFormLimit, setFavFormLimit] = useState(false)
  const [favFormCount, setFavFormCount] = useState(5)
  const [logoutMinutes, setLogoutMinutes] = useState(30)
  const fileRef = useRef<HTMLInputElement>(null)

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<CompanyForm>({
    defaultValues: {
      companyName: "", companySize: "", dateFormatAllow: "DD/MM/YYYY",
      address: "", phone: "", email: "",
      currency: "AED", tax: 5, taxName: "VAT", taxNumber: "",
      invoicePrefix: "INV", dueDate: 30, timeZone: "GMT+04:00",
      matterSeq: "", lfaSeq: "", proformaSeq: "", taxInvoiceSeq: "",
      enforcementSeq: "", enforcementInvoicePrefix: "",
      creditNoteSeq: "", creditNoteInvoicePrefix: "",
      writeOffSeq: "", writeOffInvoicePrefix: "",
    },
  })

  async function reloadCompany() {
    const info = await adminApi.getCompanyInfo() as Record<string, unknown>
    setCompanyId(String(info.id ?? info.companyId ?? ""))
    setLogoUrl(String(info.logo ?? ""))
    setFavActive(Boolean(info.favClient))
    setFavLimit(Boolean(info.favClientLimit))
    setMaxFav(Number(info.maxFavClient ?? 5))
    setAutoLogout(Boolean(info.autoLogout))
    setAutoLogoutMin(Number(info.autoLogoutMin ?? 30))
    reset({
      companyName: String(info.companyName ?? ""),
      companySize: String(info.companySize ?? ""),
      dateFormatAllow: String(info.dateFormatAllow ?? "DD/MM/YYYY"),
      address: String(info.address ?? ""),
      phone: String(info.phone ?? ""),
      email: String(info.email ?? ""),
      currency: String(info.currency ?? "AED"),
      tax: Number(info.tax ?? 5),
      taxName: String(info.taxName ?? "VAT"),
      taxNumber: String(info.taxNumber ?? ""),
      invoicePrefix: String(info.invoicePrefix ?? "INV"),
      dueDate: Number(info.dueDate ?? 30),
      timeZone: String(info.timeZone ?? "GMT+04:00"),
      matterSeq: String(info.matterSeq ?? ""),
      lfaSeq: String(info.lfaSeq ?? ""),
      proformaSeq: String(info.proformaSeq ?? ""),
      taxInvoiceSeq: String(info.taxInvoiceSeq ?? ""),
      enforcementSeq: String(info.enforcementSeq ?? ""),
      enforcementInvoicePrefix: String(info.enforcementInvoicePrefix ?? ""),
      creditNoteSeq: String(info.creditNoteSeq ?? ""),
      creditNoteInvoicePrefix: String(info.creditNoteInvoicePrefix ?? ""),
      writeOffSeq: String(info.writeOffSeq ?? ""),
      writeOffInvoicePrefix: String(info.writeOffInvoicePrefix ?? ""),
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reloadCompany()
      } catch {
        if (!cancelled) toast.error("Failed to load company info")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset])

  async function onSubmit(data: CompanyForm) {
    setSaving(true)
    logger.info("CompanySettings", "Saving", data)
    try {
      const payload: Record<string, unknown> = {
        ...data,
        matterSeq: data.matterSeq === "" ? undefined : Number(data.matterSeq),
        lfaSeq: data.lfaSeq === "" ? undefined : Number(data.lfaSeq),
        proformaSeq: data.proformaSeq === "" ? undefined : Number(data.proformaSeq),
        taxInvoiceSeq: data.taxInvoiceSeq === "" ? undefined : Number(data.taxInvoiceSeq),
        enforcementSeq: data.enforcementSeq === "" ? undefined : Number(data.enforcementSeq),
        creditNoteSeq: data.creditNoteSeq === "" ? undefined : Number(data.creditNoteSeq),
        writeOffSeq: data.writeOffSeq === "" ? undefined : Number(data.writeOffSeq),
      }
      await adminApi.updateCompany(companyId, payload)
      toast.success("Company settings saved")
      reset(data)
    } catch (e) {
      logger.error("CompanySettings", "Save failed", e)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function onLogoChange(file: File | undefined) {
    if (!file) return
    setUploadingLogo(true)
    try {
      const data = await adminApi.uploadCompanyLogo(file)
      const next = String(data.logo ?? "")
      if (next) setLogoUrl(next)
      else await reloadCompany()
      toast.success("Logo updated")
    } catch (e) {
      logger.error("CompanySettings", "Logo upload failed", e)
      toast.error("Failed to upload logo")
    } finally {
      setUploadingLogo(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function onFavSwitch(next: boolean) {
    if (next) {
      setFavFormLimit(favLimit)
      setFavFormCount(maxFav || 5)
      setFavDialog(true)
      return
    }
    setToggling(true)
    try {
      await adminApi.deactivateFavClient()
      setFavActive(false)
      toast.success("Favourite clients disabled")
      await reloadCompany()
    } catch (e) {
      logger.error("CompanySettings", "Fav deactivate failed", e)
      toast.error("Failed to disable favourite clients")
    } finally {
      setToggling(false)
    }
  }

  async function submitFav() {
    if (favFormLimit && favFormCount < 1) {
      toast.error("Limit must be at least 1")
      return
    }
    setToggling(true)
    try {
      await adminApi.activateFavClient({
        favClientLimit: favFormLimit,
        maxFavClient: favFormLimit ? favFormCount : 0,
      })
      setFavActive(true)
      setFavDialog(false)
      toast.success("Favourite clients enabled")
      await reloadCompany()
    } catch (e) {
      logger.error("CompanySettings", "Fav activate failed", e)
      toast.error("Failed to enable favourite clients")
    } finally {
      setToggling(false)
    }
  }

  async function onLogoutSwitch(next: boolean) {
    if (next) {
      setLogoutMinutes(autoLogoutMin || 30)
      setLogoutDialog(true)
      return
    }
    setToggling(true)
    try {
      await adminApi.deactivateAutoLogout()
      setAutoLogout(false)
      toast.success("Auto logout disabled")
      await reloadCompany()
    } catch (e) {
      logger.error("CompanySettings", "Auto logout deactivate failed", e)
      toast.error("Failed to disable auto logout")
    } finally {
      setToggling(false)
    }
  }

  async function submitAutoLogout() {
    if (logoutMinutes < 1) {
      toast.error("Minutes must be at least 1")
      return
    }
    setToggling(true)
    try {
      await adminApi.activateAutoLogout(logoutMinutes)
      setAutoLogout(true)
      setLogoutDialog(false)
      toast.success("Auto logout enabled")
      await reloadCompany()
    } catch (e) {
      logger.error("CompanySettings", "Auto logout activate failed", e)
      toast.error("Failed to enable auto logout")
    } finally {
      setToggling(false)
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
    <PageShell
      title="Company Info"
      description="Firm details, branding, and billing defaults"
      breadcrumbs={[
        { label: "Settings", path: "/admin/settings" },
        { label: "Company Info" },
      ]}
    >
      {loading ? (
        <CircularProgress size={28} />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 900 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Branding</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
              <Avatar
                src={logoUrl || undefined}
                variant="rounded"
                sx={{ width: 72, height: 72, bgcolor: "action.hover", fontSize: 14 }}
              >
                Logo
              </Avatar>
              <Box>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => void onLogoChange(e.target.files?.[0])}
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={uploadingLogo}
                  onClick={() => fileRef.current?.click()}
                  startIcon={uploadingLogo ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {uploadingLogo ? "Uploading…" : "Upload logo"}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  PNG or JPG. Used on invoices and the app header.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Features</Typography>
            <Box sx={{ display: "grid", gap: 1, mb: 2.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={favActive}
                    disabled={toggling}
                    onChange={(_, v) => void onFavSwitch(v)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Favourite clients</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {favActive
                        ? favLimit
                          ? `Enabled · limit ${maxFav}`
                          : "Enabled · no limit"
                        : "Let users mark priority clients"}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={autoLogout}
                    disabled={toggling}
                    onChange={(_, v) => void onLogoutSwitch(v)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Auto logout</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {autoLogout
                        ? `Enabled · ${autoLogoutMin} min idle`
                        : "Sign users out after inactivity"}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Company</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
              {field("companyName", "Company Name", { required: true })}
              {field("companySize", "Company Size")}
              {field("email", "Email", { type: "email" })}
              {field("phone", "Phone")}
              {field("address", "Address")}
              {field("timeZone", "Time Zone")}
              <Controller
                name="dateFormatAllow"
                control={control}
                render={({ field: f }) => (
                  <TextField {...f} select label="Date Format" size="small" fullWidth>
                    {DATE_FORMATS.map(fmt => (
                      <MenuItem key={fmt} value={fmt}>{fmt}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {field("currency", "Currency")}
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Billing Settings</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 2.5 }}>
              {field("invoicePrefix", "Invoice Prefix")}
              {field("taxName", "Tax Name")}
              {field("tax", "Tax Rate (%)", { type: "number" })}
              {field("taxNumber", "Tax Number")}
              {field("dueDate", "Payment Due (days)", { type: "number" })}
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Sequences</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mb: 2.5 }}>
              {field("matterSeq", "Matter Sequence", { type: "number" })}
              {field("lfaSeq", "LFA Sequence", { type: "number" })}
              {field("proformaSeq", "Proforma Sequence", { type: "number" })}
              {field("taxInvoiceSeq", "Tax Invoice Sequence", { type: "number" })}
              {field("enforcementSeq", "Enforcement Sequence", { type: "number" })}
              {field("enforcementInvoicePrefix", "Enforcement Prefix")}
              {field("creditNoteSeq", "Credit Note Sequence", { type: "number" })}
              {field("creditNoteInvoicePrefix", "Credit Note Prefix")}
              {field("writeOffSeq", "Write-off Sequence", { type: "number" })}
              {field("writeOffInvoicePrefix", "Write-off Prefix")}
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !isDirty}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button component={RouterLink} to="/admin/settings" variant="outlined">Back</Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Dialog open={favDialog} onClose={() => setFavDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Favourite Clients</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox checked={favFormLimit} onChange={(_, v) => setFavFormLimit(v)} />}
            label="Limit favourite clients"
          />
          {favFormLimit && (
            <TextField
              margin="dense"
              label="Maximum favourites"
              type="number"
              fullWidth
              size="small"
              value={favFormCount}
              onChange={e => setFavFormCount(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFavDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={toggling} onClick={() => void submitFav()}>
            {toggling ? "Saving…" : "Enable"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={logoutDialog} onClose={() => setLogoutDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Auto Logout</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Idle minutes"
            type="number"
            fullWidth
            size="small"
            value={logoutMinutes}
            onChange={e => setLogoutMinutes(Number(e.target.value))}
            slotProps={{ htmlInput: { min: 1 } }}
            helperText="Users are signed out after this many minutes of inactivity"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={toggling} onClick={() => void submitAutoLogout()}>
            {toggling ? "Saving…" : "Enable"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
