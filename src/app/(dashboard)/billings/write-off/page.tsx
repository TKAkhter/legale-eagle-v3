import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Alert, Box, Button, Checkbox, FormControlLabel, LinearProgress, MenuItem,
  Paper, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { unwrapAxiosList } from "@lib/utils/unwrap"

type WizardType = "writeOff" | "creditNote"

export default function WriteOffWizardPage() {
  const navigate = useNavigate()
  const { invoiceId: routeInvoiceId } = useParams<{ invoiceId?: string }>()
  const [searchParams] = useSearchParams()
  const initialType = (searchParams.get("type") === "creditNote" ? "creditNote" : "writeOff") as WizardType

  const [type, setType] = useState<WizardType>(initialType)
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [invoiceId, setInvoiceId] = useState(routeInvoiceId ?? "")
  const [billedAmount, setBilledAmount] = useState(0)
  const [writeOffAmount, setWriteOffAmount] = useState("")
  const [vatPercent, setVatPercent] = useState("5")
  const [reason, setReason] = useState("")
  const [byHour, setByHour] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<Record<string, { selected: boolean; amount: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prefillQ = useQuery({
    queryKey: ["invoice", "write-off-prefill", routeInvoiceId],
    queryFn: () => billingApi.getById(String(routeInvoiceId)),
    enabled: !!routeInvoiceId,
  })

  useEffect(() => {
    const inv = prefillQ.data as Record<string, unknown> | undefined
    if (!inv) return
    setInvoiceId(String(inv.id ?? routeInvoiceId))
    setClientId(String(inv.clientId ?? (inv.client as { id?: string })?.id ?? ""))
    setMatterId(String(inv.matterId ?? (inv.matter as { id?: string })?.id ?? ""))
    const due = Number(inv.dueAmount ?? inv.taxableAmount ?? inv.amount ?? 0)
    const taxAmt = Number(inv.taxableAmount ?? 0)
    setBilledAmount(Math.max(due - taxAmt, Number(inv.amount ?? due) || 0))
    setVatPercent(String(inv.tax ?? inv.taxPercent ?? 5))
  }, [prefillQ.data, routeInvoiceId])

  const invoicesQ = useQuery({
    queryKey: ["billings", "write-off-invoices", type, clientId, matterId],
    queryFn: () => billingApi.filterInvoicesForWriteOff({ type, clientId, matterId }),
    enabled: !routeInvoiceId && (!!clientId || !!matterId),
  })

  const invoiceOpts = useMemo(() => {
    const list = (invoicesQ.data ?? []) as Record<string, unknown>[]
    return list.map(i => ({
      value: String(i.id),
      label: String(i.invoiceNo ?? i.taxInvoiceNo ?? i.id),
      row: i,
    }))
  }, [invoicesQ.data])

  useEffect(() => {
    if (routeInvoiceId || !invoiceId) return
    const found = invoiceOpts.find(o => o.value === invoiceId)?.row
    if (!found) return
    const due = Number(found.dueAmount ?? found.taxableAmount ?? found.amount ?? 0)
    setBilledAmount(due)
    setVatPercent(String(found.tax ?? found.taxPercent ?? vatPercent))
  }, [invoiceId, invoiceOpts, routeInvoiceId, vatPercent])

  const activitiesQ = useQuery({
    queryKey: ["billings", "write-off-activities", invoiceId],
    queryFn: () => billingApi.getActivitiesByInvoice(invoiceId),
    enabled: byHour && !!invoiceId,
  })

  const activities = (activitiesQ.data ?? []) as Record<string, unknown>[]

  const vatAmount = useMemo(() => {
    const amt = Number(writeOffAmount) || 0
    const pct = Number(vatPercent) || 0
    return Number(((amt * pct) / 100).toFixed(2))
  }, [writeOffAmount, vatPercent])

  const remaining = Math.max(billedAmount - (Number(writeOffAmount) || 0), 0)

  async function onSubmit() {
    setError(null)
    if (!invoiceId) { setError("Select an invoice"); return }
    const amt = Number(writeOffAmount)
    if (!amt || amt <= 0) {
      setError(type === "creditNote" ? "Credit note amount must be greater than 0" : "Write-off amount must be greater than 0")
      return
    }
    setSubmitting(true)
    try {
      const activityList = byHour
        ? activities
          .filter(a => selectedActivities[String(a.activityId ?? a.id)]?.selected)
          .map(a => ({
            activityId: String(a.activityId ?? a.id),
            amount: Number(selectedActivities[String(a.activityId ?? a.id)]?.amount ?? a.amount ?? 0),
            activityDuration: a.activityDuration ?? "",
          }))
        : []

      const msg = await billingApi.writeOffDetailed(invoiceId, type, {
        writeOffAmount: amt,
        vatPercent: Number(vatPercent) || 0,
        reason,
        totalValAmount: vatAmount,
        writeOffVatAmount: vatAmount,
        manualProformaNumber: "",
        invoiceManualDate: "",
        byHour,
        activityList,
      })
      toast.success(msg)
      navigate("/billings")
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Request failed"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Load matters for client when needed for display — MatterSelectFilter handles its own fetch
  useQuery({
    queryKey: ["matters", "mini-by-client", clientId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA || !clientId) return []
      const r = await axiosClient.get("/api/matter/mini/by/client", { params: { clientId } })
      return unwrapAxiosList(r.data)
    },
    enabled: !!clientId && !routeInvoiceId,
  })

  const title = type === "creditNote" ? "Invoice Credit Note" : "Write Off Invoice"

  return (
    <PageShell
      title={title}
      description="Adjust invoice balance by write-off or credit note"
      breadcrumbs={[
        { label: "Billing", path: "/billings" },
        { label: type === "creditNote" ? "Credit Note" : "Write Off" },
      ]}
    >
      {prefillQ.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          select
          size="small"
          label="Type"
          value={type}
          onChange={e => {
            setType(e.target.value as WizardType)
            if (!routeInvoiceId) {
              setInvoiceId("")
              setBilledAmount(0)
              setWriteOffAmount("")
            }
          }}
          sx={{ maxWidth: 240 }}
          disabled={!!routeInvoiceId}
        >
          <MenuItem value="writeOff">Write Off</MenuItem>
          <MenuItem value="creditNote">Credit Note</MenuItem>
        </TextField>

        {!routeInvoiceId && (
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-end" }}>
            <ClientSelectFilter
              value={clientId}
              onChange={v => {
                setClientId(v ?? "")
                setMatterId("")
                setInvoiceId("")
              }}
            />
            <MatterSelectFilter
              value={matterId || undefined}
              onChange={v => {
                setMatterId(v ?? "")
                setInvoiceId("")
              }}
            />
            <TextField
              select
              size="small"
              label="Invoice"
              value={invoiceId}
              onChange={e => setInvoiceId(e.target.value)}
              sx={{ minWidth: 220 }}
              disabled={invoiceOpts.length === 0}
            >
              <MenuItem value=""><em>Select invoice</em></MenuItem>
              {invoiceOpts.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {routeInvoiceId && (
          <Typography variant="body2" color="text.secondary">
            Invoice: <strong>{String((prefillQ.data as { invoiceNo?: string })?.invoiceNo ?? routeInvoiceId)}</strong>
          </Typography>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
          <TextField
            size="small"
            label="Billed Amount"
            value={formatCurrency(billedAmount)}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label={type === "creditNote" ? "Credit Note Amount" : "Write-Off Amount"}
            type="number"
            value={writeOffAmount}
            onChange={e => setWriteOffAmount(e.target.value)}
            required
          />
          <TextField
            size="small"
            label="VAT %"
            type="number"
            value={vatPercent}
            onChange={e => setVatPercent(e.target.value)}
          />
          <TextField
            size="small"
            label="VAT Amount"
            value={formatCurrency(vatAmount)}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Remaining"
            value={formatCurrency(remaining)}
            slotProps={{ input: { readOnly: true } }}
          />
        </Box>

        <TextField
          size="small"
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          multiline
          rows={2}
          fullWidth
        />

        <FormControlLabel
          control={<Checkbox checked={byHour} onChange={e => setByHour(e.target.checked)} />}
          label="Allocate by hour / activity"
        />

        {byHour && (
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            {activitiesQ.isLoading && <LinearProgress />}
            {activities.length === 0 && !activitiesQ.isLoading ? (
              <Box sx={{ p: 2 }}><Typography color="text.secondary" variant="body2">No activities on this invoice.</Typography></Box>
            ) : (
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                    {["", "Activity", "Duration", "Amount"].map(h => (
                      <Box component="th" key={h || "chk"} sx={{ px: 1.5, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {activities.map(a => {
                    const id = String(a.activityId ?? a.id)
                    const sel = selectedActivities[id] ?? { selected: false, amount: String(a.amount ?? 0) }
                    return (
                      <Box component="tr" key={id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                          <Checkbox
                            size="small"
                            checked={sel.selected}
                            onChange={e => setSelectedActivities(p => ({
                              ...p,
                              [id]: { ...sel, selected: e.target.checked },
                            }))}
                          />
                        </Box>
                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{String(a.activity ?? a.note ?? id)}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{String(a.activityDuration ?? "—")}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={sel.amount}
                            onChange={e => setSelectedActivities(p => ({
                              ...p,
                              [id]: { ...sel, amount: e.target.value },
                            }))}
                            sx={{ width: 110 }}
                          />
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Paper>
        )}

        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
          <Button onClick={() => navigate("/billings")}>Cancel</Button>
          <Button variant="contained" disabled={submitting || !invoiceId} onClick={onSubmit}>
            {type === "creditNote" ? "Apply Credit Note" : "Write Off"}
          </Button>
        </Box>
      </Paper>
    </PageShell>
  )
}
