/**
 * Record payment — LMS `/payment?id=` parity.
 * Bank account, mode, date, reference, credit-note apply, attachment, description.
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@/components/filters/ClientSelectFilter"
import { bankAccountsApi } from "@/api/bankAccounts"
import { billingApi } from "@/api/billing"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function payableBalance(invoice: Record<string, unknown>): number {
  const due = Number(invoice.dueAmount ?? 0)
  const paid = Number(invoice.paidAmount ?? 0)
  const writeOff = Number(invoice.writeOffAmount ?? 0)
  const creditNote = Number(invoice.creditNoteAmount ?? 0)
  return Math.max(0, Number((due - paid - writeOff - creditNote).toFixed(2)))
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const invoiceId = params.get("invoiceId") ?? params.get("id") ?? ""

  const [clientId, setClientId] = useState("")
  const [pickedInvoiceId, setPickedInvoiceId] = useState(invoiceId)
  const activeInvoiceId = invoiceId || pickedInvoiceId

  const [bankAccountId, setBankAccountId] = useState("")
  const [paymentMode, setPaymentMode] = useState("cash")
  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [referenceNo, setReferenceNo] = useState("")
  const [amount, setAmount] = useState("")
  const [useCreditNote, setUseCreditNote] = useState(false)
  const [creditNoteAmount, setCreditNoteAmount] = useState("0")
  const [description, setDescription] = useState("")
  const [attachment, setAttachment] = useState<unknown>(null)
  const [fileLabel, setFileLabel] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const invoiceQuery = useQuery({
    queryKey: ["payment", "invoice", activeInvoiceId],
    enabled: Boolean(activeInvoiceId),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return {
          id: activeInvoiceId || "inv1",
          taxInvoiceNo: "INV-1001",
          dueAmount: 20000,
          paidAmount: 5000,
          writeOffAmount: 0,
          creditNoteAmount: 2000,
          client: { id: "c1", companyName: "Al Rashid Holdings", bankAccount: { id: "ba1" } },
        }
      }
      const res = await axiosClient.get("/api/invoice/get/by/id", { params: { invoiceId: activeInvoiceId } })
      return res.data?.data ?? res.data
    },
  })

  const invoicesQuery = useQuery({
    queryKey: ["payment", "client-invoices", clientId],
    enabled: !invoiceId && Boolean(clientId),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "inv1", taxInvoiceNo: "INV-1001", dueAmount: 15000, paidAmount: 0 },
          { id: "inv2", taxInvoiceNo: "INV-1002", dueAmount: 8000, paidAmount: 2000 },
        ]
      }
      const page = await billingApi.getAll({
        page: 0,
        pageSize: 50,
        filters: { clientId, status: "Unpaid" },
      })
      return page.content as Record<string, unknown>[]
    },
  })

  const banksQuery = useQuery({
    queryKey: ["bank-accounts", "payment"],
    queryFn: () => bankAccountsApi.getAll({ page: 0, pageSize: 100 }),
  })

  const invoice = (invoiceQuery.data ?? {}) as Record<string, unknown>
  const balance = useMemo(() => payableBalance(invoice), [invoice])
  const availableCredit = Number(invoice.creditNoteAmount ?? 0)
  const payable = useMemo(() => {
    const amt = Number(amount) || 0
    if (!useCreditNote) return amt
    return Math.max(0, Number((amt - (Number(creditNoteAmount) || 0)).toFixed(2)))
  }, [amount, useCreditNote, creditNoteAmount])

  useEffect(() => {
    if (!invoiceQuery.data) return
    const inv = invoiceQuery.data as Record<string, unknown>
    const bal = payableBalance(inv)
    setAmount(String(bal))
    setCreditNoteAmount(String(Number(inv.creditNoteAmount ?? 0).toFixed(2)))
    setUseCreditNote(false)
    const clientBank = (inv.client as { bankAccount?: { id?: string } } | undefined)?.bankAccount?.id
    if (clientBank) setBankAccountId(String(clientBank))
    setError("")
  }, [invoiceQuery.data])

  async function onFileChange(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      if (env.USE_STATIC_DATA) {
        setAttachment({ name: file.name, url: "#" })
        setFileLabel(file.name)
        return
      }
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folderName", "Payments")
      formData.append("uuid", "payment")
      const res = await axiosClient.post("/api/util/fileUpload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const data = res.data?.data ?? res.data
      setAttachment(Array.isArray(data) ? data[0] : data)
      setFileLabel(file.name)
    } catch {
      setError("Failed to upload attachment")
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!activeInvoiceId) {
      setError("Select an invoice to pay")
      return
    }
    if (!bankAccountId) {
      setError("Please select bank account.")
      return
    }
    if (!paymentMode) {
      setError("Payment mode is required")
      return
    }
    if (!paymentDate) {
      setError("Payment date is required")
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 1) {
      setError("Minimum amount is one.")
      return
    }
    if (useCreditNote) {
      const cn = Number(creditNoteAmount) || 0
      if (cn < 0 || cn > availableCredit) {
        setError("Credit note amount is invalid")
        return
      }
    }

    setSaving(true)
    setError("")
    try {
      await billingApi.recordPayment(activeInvoiceId, {
        amount: amt,
        amount2: useCreditNote ? payable : amt,
        bankAccountId,
        paymentMode,
        paymentDate,
        referenceNo,
        description,
        useCreditNote,
        creditNote: availableCredit,
        creditNoteAmount: useCreditNote ? Number(creditNoteAmount) || 0 : 0,
        invoiceAmount: balance,
        attachment: attachment ?? "",
      })
      toast.success("Payment recorded")
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["payment"] })
      qc.invalidateQueries({ queryKey: ["billings"] })
      if (activeInvoiceId) navigate(`/billings/${activeInvoiceId}`)
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Payment failed",
      )
    } finally {
      setSaving(false)
    }
  }

  const banks = banksQuery.data?.content ?? []
  const clientInvoices = (invoicesQuery.data ?? []) as Record<string, unknown>[]

  return (
    <PageShell
      title="Record Payment"
      description="Apply a payment against an invoice"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Payment" }]}
    >
      {!activeInvoiceId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Select invoice
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
            <ClientSelectFilter value={clientId} onChange={v => { setClientId(v ?? ""); setPickedInvoiceId("") }} />
            <FormControl size="small" sx={{ minWidth: 220 }} disabled={!clientId}>
              <InputLabel>Invoice</InputLabel>
              <Select
                label="Invoice"
                value={pickedInvoiceId}
                onChange={e => setPickedInvoiceId(e.target.value)}
              >
                {clientInvoices.map(inv => (
                  <MenuItem key={String(inv.id)} value={String(inv.id)}>
                    {String(inv.taxInvoiceNo ?? inv.invoiceNo ?? inv.id)}
                    {" · "}
                    {formatCurrency(Number(inv.dueAmount ?? 0) - Number(inv.paidAmount ?? 0))}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}

      {activeInvoiceId && invoiceQuery.isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {activeInvoiceId && !invoiceQuery.isLoading && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 720 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Invoice {String(invoice.taxInvoiceNo ?? invoice.invoiceNo ?? activeInvoiceId)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {String(
              (invoice.client as { companyName?: string; firstName?: string; lastName?: string } | undefined)?.companyName
              || `${(invoice.client as { firstName?: string } | undefined)?.firstName ?? ""} ${(invoice.client as { lastName?: string } | undefined)?.lastName ?? ""}`.trim()
              || String(invoice.clientName ?? "")
              || "—",
            )}
            {" · "}Balance due {formatCurrency(balance)}
            {availableCredit > 0 ? ` · Available credit note ${formatCurrency(availableCredit)}` : ""}
          </Typography>

          {availableCredit > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
              <TextField
                size="small"
                label="Available Credit Note"
                value={availableCredit.toFixed(2)}
                disabled
                sx={{ width: 180 }}
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={useCreditNote}
                    onChange={e => {
                      const checked = e.target.checked
                      setUseCreditNote(checked)
                      if (checked) {
                        setCreditNoteAmount(String(availableCredit.toFixed(2)))
                      } else {
                        setAmount(String(balance))
                        setCreditNoteAmount(String(availableCredit.toFixed(2)))
                      }
                    }}
                  />
                )}
                label="Use Credit Note"
              />
            </Box>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel>Bank Account</InputLabel>
              <Select label="Bank Account" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                {banks.map(b => (
                  <MenuItem key={String(b.id)} value={String(b.id)}>
                    {String(b.accountName ?? b.id)}
                    {b.accountNumber ? ` (${String(b.accountNumber)})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth required>
              <InputLabel>Payment Mode</InputLabel>
              <Select label="Payment Mode" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="check">Cheque</MenuItem>
                <MenuItem value="online">Online</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Payment Date"
              type="date"
              required
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              size="small"
              label="Reference Number"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
            />

            {useCreditNote && (
              <TextField
                size="small"
                label="Credit Note Amount"
                type="number"
                value={creditNoteAmount}
                onChange={e => setCreditNoteAmount(e.target.value)}
              />
            )}

            <TextField
              size="small"
              label="Amount"
              type="number"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />

            {useCreditNote && (
              <TextField
                size="small"
                label="Payable"
                type="number"
                value={payable}
                disabled
              />
            )}

            <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
              <Button component="label" size="small" variant="outlined" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload Document"}
                <input
                  type="file"
                  hidden
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => { void onFileChange(e.target.files?.[0]) }}
                />
              </Button>
              {fileLabel && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {fileLabel}
                </Typography>
              )}
            </Box>

            <TextField
              size="small"
              label="Description"
              multiline
              minRows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
            <Button onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
            <Button
              variant="contained"
              disabled={saving || uploading}
              onClick={() => { void submit() }}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Save Payment
            </Button>
          </Box>
        </Paper>
      )}
    </PageShell>
  )
}
