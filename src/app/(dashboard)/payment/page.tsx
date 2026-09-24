import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem,
  Paper, Select, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { axiosClient } from "@lib/api/axios"
import { bankAccountsApi } from "@/api/bankAccounts"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function PaymentPage() {
  const [params] = useSearchParams()
  const invoiceId = params.get("invoiceId") ?? params.get("id") ?? ""
  const [bankAccountId, setBankAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [reference, setReference] = useState("")
  const [saving, setSaving] = useState(false)

  const invoiceQuery = useQuery({
    queryKey: ["payment", "invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return { id: invoiceId || "inv1", taxInvoiceNo: "INV-1001", dueAmount: 15000, paidAmount: 5000, clientName: "Al Rashid Holdings" }
      }
      const res = await axiosClient.get("/api/invoice/get/by/id", { params: { invoiceId } })
      return res.data?.data ?? res.data
    },
  })

  const banksQuery = useQuery({
    queryKey: ["bank-accounts", "payment"],
    queryFn: () => bankAccountsApi.getAll({ page: 0, pageSize: 100 }),
  })

  const invoice = (invoiceQuery.data ?? {}) as Record<string, unknown>
  const due = Number(invoice.dueAmount ?? invoice.taxableAmount ?? 0)
  const paid = Number(invoice.paidAmount ?? 0)
  const balance = due - paid

  useEffect(() => {
    if (balance > 0 && !amount) setAmount(String(balance))
  }, [balance, amount])

  async function submit() {
    if (!invoiceId) {
      toast.error("Open payment with ?invoiceId=<id>")
      return
    }
    if (!bankAccountId || !amount) {
      toast.error("Bank account and amount are required")
      return
    }
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/invoice/pay", {
          amount: Number(amount),
          bankAccountId,
          paymentDate,
          reference,
        }, { params: { invoiceId } })
      }
      toast.success("Payment recorded")
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg ?? "Payment failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Record Payment" description="Apply a payment against an invoice">
      {!invoiceId && <Alert severity="info" sx={{ mb: 2 }}>Open this page with ?invoiceId=&lt;id&gt; from an invoice.</Alert>}
      {invoiceId && invoiceQuery.isLoading && <CircularProgress size={28} />}
      {invoiceId && !invoiceQuery.isLoading && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 560 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Invoice {String(invoice.taxInvoiceNo ?? invoice.invoiceNo ?? invoiceId)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {String(invoice.clientName ?? (invoice.client as { companyName?: string } | undefined)?.companyName ?? "—")}
            {" · "}Due {formatCurrency(due)} · Paid {formatCurrency(paid)} · Balance {formatCurrency(balance)}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Bank Account</InputLabel>
              <Select label="Bank Account" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                {(banksQuery.data?.content ?? []).map(b => (
                  <MenuItem key={String(b.id)} value={String(b.id)}>
                    {String(b.accountName ?? b.bankName ?? b.id)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <TextField size="small" label="Payment Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            <TextField size="small" label="Reference" value={reference} onChange={e => setReference(e.target.value)} />
            <Button variant="contained" disabled={saving} onClick={submit}>Record Payment</Button>
          </Box>
        </Paper>
      )}
    </PageShell>
  )
}
