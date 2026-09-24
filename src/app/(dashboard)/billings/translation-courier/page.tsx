/**
 * Translation / Courier billing — LMS POST /invoice/transactional/courier.
 */
import { useEffect, useMemo, useState } from "react"
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { axiosClient } from "@lib/api/axios"
import { adminApi } from "@/api/admin"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function TranslationCourierPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<"Transactional" | "Courier">("Transactional")
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [description, setDescription] = useState("")
  const [pages, setPages] = useState("1")
  const [rate, setRate] = useState("")
  const [vatPercentage, setVatPercentage] = useState("5")
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [dateOfSupply, setDateOfSupply] = useState(today)
  const [manualProforma, setManualProforma] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: company } = useQuery({
    queryKey: ["company-info-tax"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
  })

  useEffect(() => {
    if (company?.tax != null) setVatPercentage(String(company.tax))
  }, [company])

  const amount = useMemo(() => {
    if (type !== "Transactional") return Number(rate) || 0
    return (Number(pages) || 0) * (Number(rate) || 0)
  }, [type, pages, rate])

  const vatAmount = useMemo(
    () => amount * ((Number(vatPercentage) || 0) / 100),
    [amount, vatPercentage],
  )
  const totalAmount = amount + vatAmount

  async function submit() {
    if (!clientId) {
      toast.error("Select a client")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    if (type === "Transactional" && (!(Number(pages) >= 1) || !(Number(rate) >= 1))) {
      toast.error("Pages and rate must be at least 1")
      return
    }
    if (!issueDate || !dueDate) {
      toast.error("Issue and due dates are required")
      return
    }
    if (dueDate < issueDate) {
      toast.error("Due date can't be before issue date")
      return
    }

    setSaving(true)
    try {
      const payload = {
        clientId,
        matterId: matterId || "",
        type,
        page: type === "Transactional" ? Number(pages) || 0 : 0,
        rate: Number(rate) || 0,
        amount,
        vatPercentage: Number(vatPercentage) || 0,
        vatPercentageAmount: vatAmount,
        totalAmount,
        manualProforma: Number(manualProforma) || 0,
        description: description.trim(),
        issueDate,
        dueDate,
        dateOfSupply: dateOfSupply || null,
      }
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/invoice/transactional/courier", payload)
      }
      toast.success("Invoice created")
      setDescription("")
      setRate("")
      setPages("1")
      setManualProforma("")
      setMatterId("")
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? "Failed to create invoice",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title="Translation / Courier"
      description="Create transactional translation or courier billing invoices"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Translation / Courier" }]}
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 720 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>New invoice</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField select label="Type" size="small" value={type} onChange={e => setType(e.target.value as "Transactional" | "Courier")}>
            <MenuItem value="Transactional">Transactional</MenuItem>
            <MenuItem value="Courier">Courier</MenuItem>
          </TextField>

          <ClientSelectFilter value={clientId} onChange={v => { setClientId(v ?? ""); setMatterId("") }} />
          <MatterSelectFilter value={matterId} onChange={v => setMatterId(v ?? "")} />

          <TextField
            label="Description" size="small" multiline minRows={2}
            value={description} onChange={e => setDescription(e.target.value)} required
          />

          {type === "Transactional" && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Pages" size="small" type="number" value={pages} onChange={e => setPages(e.target.value)} />
              <TextField label="Rate per page" size="small" type="number" value={rate} onChange={e => setRate(e.target.value)} />
            </Box>
          )}
          {type === "Courier" && (
            <TextField label="Amount" size="small" type="number" value={rate} onChange={e => setRate(e.target.value)} />
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Issue Date" size="small" type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={issueDate} onChange={e => setIssueDate(e.target.value)}
            />
            <TextField
              label="Due Date" size="small" type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={dueDate} onChange={e => setDueDate(e.target.value)}
            />
            <TextField
              label="Date of Supply" size="small" type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={dateOfSupply} onChange={e => setDateOfSupply(e.target.value)}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="VAT %" size="small" type="number"
              value={vatPercentage} onChange={e => setVatPercentage(e.target.value)}
            />
            <TextField
              label="Manual Proforma #" size="small" type="number"
              value={manualProforma} onChange={e => setManualProforma(e.target.value)}
            />
          </Box>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
            <Typography variant="body2">Amount (ex VAT): {formatCurrency(amount)}</Typography>
            <Typography variant="body2">VAT: {formatCurrency(vatAmount)}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.5 }}>
              Total: {formatCurrency(totalAmount)}
            </Typography>
          </Paper>

          <Button variant="contained" disabled={saving} onClick={submit} sx={{ alignSelf: "flex-start" }}>
            {saving ? "Creating…" : "Create Invoice"}
          </Button>
        </Box>
      </Paper>
    </PageShell>
  )
}
