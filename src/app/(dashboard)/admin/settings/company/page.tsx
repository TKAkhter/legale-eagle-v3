/**
 * Company Info settings — LMS /company-info parity.
 */
import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Paper, Typography, TextField, Button, CircularProgress, Divider,
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import { PageShell } from "@/components/ui/PageShell"
import { adminApi } from "@/api/admin"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

interface CompanyForm {
  companyName: string
  address: string
  phone: string
  email: string
  currency: string
  tax: number
  taxName: string
  invoicePrefix: string
  dueDate: number
  timeZone: string
}

export default function CompanySettingsPage() {
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [loading, setLoading] = useState(true)

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<CompanyForm>({
    defaultValues: {
      companyName: "", address: "", phone: "", email: "",
      currency: "AED", tax: 5, taxName: "VAT", invoicePrefix: "INV",
      dueDate: 30, timeZone: "GMT+04:00",
    },
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const info = await adminApi.getCompanyInfo() as Record<string, unknown>
        if (cancelled) return
        setCompanyId(String(info.id ?? info.companyId ?? ""))
        reset({
          companyName: String(info.companyName ?? ""),
          address: String(info.address ?? ""),
          phone: String(info.phone ?? ""),
          email: String(info.email ?? ""),
          currency: String(info.currency ?? "AED"),
          tax: Number(info.tax ?? 5),
          taxName: String(info.taxName ?? "VAT"),
          invoicePrefix: String(info.invoicePrefix ?? "INV"),
          dueDate: Number(info.dueDate ?? 30),
          timeZone: String(info.timeZone ?? "GMT+04:00"),
        })
      } catch {
        toast.error("Failed to load company info")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [reset])

  async function onSubmit(data: CompanyForm) {
    setSaving(true)
    logger.info("CompanySettings", "Saving", data)
    try {
      await adminApi.updateCompany(companyId, data as unknown as Record<string, unknown>)
      toast.success("Company settings saved")
      reset(data)
    } catch (e) {
      logger.error("CompanySettings", "Save failed", e)
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
    <PageShell
      title="Company Info"
      description="Firm details and billing defaults"
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
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
              {field("companyName", "Company Name", { required: true })}
              {field("email", "Email", { type: "email" })}
              {field("phone", "Phone")}
              {field("address", "Address")}
              {field("currency", "Currency")}
              {field("timeZone", "Time Zone")}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Billing Settings</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 2.5 }}>
              {field("invoicePrefix", "Invoice Prefix")}
              {field("taxName", "Tax Name")}
              {field("tax", "Tax Rate (%)", { type: "number" })}
              {field("dueDate", "Payment Due (days)", { type: "number" })}
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
    </PageShell>
  )
}
