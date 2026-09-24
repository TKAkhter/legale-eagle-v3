/**
 * Quick payment dialog — uses same LMS /invoice/pay payload as /payment page.
 */
import { useEffect, useMemo, useState } from "react"
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel,
  MenuItem, Select, TextField, Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { bankAccountsApi } from "@/api/bankAccounts"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  invoiceId: string
  invoiceNo: string
  balance: number
  availableCreditNote?: number
  defaultBankAccountId?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RecordPaymentDialog({
  open,
  onClose,
  invoiceId,
  invoiceNo,
  balance,
  availableCreditNote = 0,
  defaultBankAccountId = "",
}: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [bankAccountId, setBankAccountId] = useState(defaultBankAccountId)
  const [paymentMode, setPaymentMode] = useState("cash")
  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [referenceNo, setReferenceNo] = useState("")
  const [amount, setAmount] = useState(String(balance))
  const [useCreditNote, setUseCreditNote] = useState(false)
  const [creditNoteAmount, setCreditNoteAmount] = useState(String(availableCreditNote))
  const [description, setDescription] = useState("")

  const banksQ = useQuery({
    queryKey: ["bank-accounts", "payment-dialog"],
    enabled: open,
    queryFn: () => bankAccountsApi.getAll({ page: 0, pageSize: 100 }),
  })

  useEffect(() => {
    if (!open) return
    setError("")
    setAmount(String(balance))
    setCreditNoteAmount(String(availableCreditNote))
    setUseCreditNote(false)
    setPaymentMode("cash")
    setPaymentDate(todayIso())
    setReferenceNo("")
    setDescription("")
    setBankAccountId(defaultBankAccountId)
  }, [open, balance, availableCreditNote, defaultBankAccountId])

  const payable = useMemo(() => {
    const amt = Number(amount) || 0
    if (!useCreditNote) return amt
    return Math.max(0, Number((amt - (Number(creditNoteAmount) || 0)).toFixed(2)))
  }, [amount, useCreditNote, creditNoteAmount])

  async function submit() {
    if (!bankAccountId) { setError("Please select bank account."); return }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 1) { setError("Minimum amount is one."); return }
    setSaving(true)
    setError("")
    try {
      await billingApi.recordPayment(invoiceId, {
        amount: amt,
        amount2: useCreditNote ? payable : amt,
        bankAccountId,
        paymentMode,
        paymentDate,
        referenceNo,
        description,
        useCreditNote,
        creditNote: availableCreditNote,
        creditNoteAmount: useCreditNote ? Number(creditNoteAmount) || 0 : 0,
        invoiceAmount: balance,
        attachment: "",
      })
      toast.success("Payment recorded")
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["billings"] })
      onClose()
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

  const banks = banksQ.data?.content ?? []

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Record Payment</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Invoice <strong>#{invoiceNo}</strong> — Balance: <strong>{formatCurrency(balance)}</strong>
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {availableCreditNote > 0 && (
            <FormControlLabel
              control={(
                <Checkbox
                  checked={useCreditNote}
                  onChange={e => setUseCreditNote(e.target.checked)}
                />
              )}
              label={`Use credit note (available ${formatCurrency(availableCreditNote)})`}
            />
          )}
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
          <TextField size="small" label="Reference Number" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
          {useCreditNote && (
            <TextField
              size="small"
              label="Credit Note Amount"
              type="number"
              value={creditNoteAmount}
              onChange={e => setCreditNoteAmount(e.target.value)}
            />
          )}
          <TextField size="small" label="Amount" type="number" required value={amount} onChange={e => setAmount(e.target.value)} />
          {useCreditNote && (
            <TextField size="small" label="Payable" type="number" value={payable} disabled />
          )}
          <TextField
            size="small"
            label="Description"
            multiline
            minRows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button size="small" onClick={() => { onClose(); navigate(`/payment?invoiceId=${invoiceId}`) }}>
            Open full payment form
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => { void submit() }}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
