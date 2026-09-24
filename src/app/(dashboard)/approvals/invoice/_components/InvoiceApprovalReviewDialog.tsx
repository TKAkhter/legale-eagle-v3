import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, TextField, Typography,
} from "@mui/material"
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep"
import LocalOfferIcon from "@mui/icons-material/LocalOffer"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { timelogsApi } from "@/api/timelogs"
import { env } from "@/config/env"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  approval: Record<string, unknown> | null
  onDone: () => void
}

type AdjustMode = "purge" | "discount"

/** LMS ApproveInvoice depth — summary, activity lines with purge/discount, approve/reject. */
export function InvoiceApprovalReviewDialog({ open, onClose, approval, onDone }: Props) {
  const qc = useQueryClient()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [adjust, setAdjust] = useState<{ id: string; mode: AdjustMode } | null>(null)
  const [hours, setHours] = useState("0")
  const [minutes, setMinutes] = useState("0")

  const invoiceId = String(approval?.invoiceId ?? (approval?.invoice as { id?: string } | undefined)?.id ?? "")
  const attorneyId = String(approval?.attorneyId ?? approval?.userId ?? "")

  const detailQuery = useQuery({
    queryKey: ["invoice-approval", "detail", invoiceId || approval?.id],
    enabled: open && !!(invoiceId || approval?.id),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return {
          taxInvoiceNo: approval?.invoiceNo ?? "INV-1001",
          clientName: (approval?.client as { companyName?: string })?.companyName ?? "Client",
          taxableAmount: approval?.taxableAmount ?? 12000,
          issueDate: approval?.issueDate,
        }
      }
      try {
        const res = await axiosClient.get("/api/invoice/get/by/id", {
          params: { invoiceId: invoiceId || approval?.id },
        })
        return res.data?.data ?? res.data
      } catch {
        return approval
      }
    },
  })

  const linesQuery = useQuery({
    queryKey: ["invoice-approval", "lines", invoiceId, attorneyId],
    enabled: open && !!invoiceId,
    queryFn: () => timelogsApi.getByInvoice(invoiceId, attorneyId || undefined),
  })

  useEffect(() => {
    if (open) { setReason(""); setError(""); setAdjust(null) }
  }, [open])

  async function act(approve: boolean) {
    if (!approve && !reason.trim()) { setError("Rejection reason is required"); return }
    setBusy(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA && approval?.id) {
        await axiosClient.post(
          "/api/invoice/ap/approve/single",
          { status: approve ? "Completed" : "Rejected", rejectedReason: approve ? "" : reason },
          { params: { invoiceApprovalsId: approval.id } },
        )
      }
      toast.success(approve ? "Invoice approved" : "Invoice rejected")
      onDone()
    } catch {
      setError("Action failed")
    } finally {
      setBusy(false)
    }
  }

  async function applyAdjust() {
    if (!adjust || !invoiceId) return
    setBusy(true)
    try {
      const body = { billedHours: Number(hours) || 0, billedMinutes: Number(minutes) || 0 }
      if (adjust.mode === "purge") toast.success(await timelogsApi.purgeForInvoice(invoiceId, adjust.id, body))
      else toast.success(await timelogsApi.discountForInvoice(invoiceId, adjust.id, body))
      setAdjust(null)
      qc.invalidateQueries({ queryKey: ["invoice-approval", "lines", invoiceId] })
    } catch {
      toast.error("Adjustment failed")
    } finally {
      setBusy(false)
    }
  }

  const d = (detailQuery.data ?? approval ?? {}) as Record<string, unknown>
  const lines = (linesQuery.data ?? []) as Record<string, unknown>[]

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Review Invoice Approval</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Invoice #</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{String(d.taxInvoiceNo ?? d.invoiceNo ?? approval?.invoiceNo ?? "—")}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(Number(d.taxableAmount ?? d.dueAmount ?? approval?.taxableAmount ?? 0))}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Client</Typography>
              <Typography variant="body2">{String(d.clientName ?? (d.client as { companyName?: string } | undefined)?.companyName ?? (approval?.client as { companyName?: string } | undefined)?.companyName ?? "—")}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Issued</Typography>
              <Typography variant="body2">{d.issueDate || approval?.issueDate ? formatDate(String(d.issueDate ?? approval?.issueDate)) : "—"}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Time lines</Typography>
          {!lines.length && !linesQuery.isLoading && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No activity lines</Typography>
          )}
          {lines.map((line, i) => {
            const id = String(line.id ?? i)
            const h = Number(line.hours ?? line.totalHours ?? 0)
            const m = Number(line.minutes ?? 0)
            return (
              <Box key={id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 1, borderBottom: "1px solid", borderColor: "divider", alignItems: "center", flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(line.activity ?? line.activityName ?? line.description ?? `Line ${i + 1}`)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {h || m ? `${h}:${String(m).padStart(2, "0")}h` : "0h"}
                    {" · "}
                    {formatCurrency(Number(line.billing ?? line.amount ?? 0))}
                    {line.note ? ` · ${String(line.note)}` : ""}
                  </Typography>
                </Box>
                {!!invoiceId && (
                  <Box>
                    <IconButton size="small" title="Purge" onClick={() => { setAdjust({ id, mode: "purge" }); setHours("0"); setMinutes("0") }}>
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" title="Discount" onClick={() => { setAdjust({ id, mode: "discount" }); setHours("0"); setMinutes("0") }}>
                      <LocalOfferIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )
          })}

          <TextField
            size="small"
            fullWidth
            label="Rejection reason"
            multiline
            minRows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            sx={{ mt: 2 }}
            helperText="Required when rejecting"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button color="error" variant="outlined" disabled={busy} onClick={() => void act(false)}>Reject</Button>
          <Button variant="contained" disabled={busy} onClick={() => void act(true)}>Approve</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!adjust} onClose={() => setAdjust(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{adjust?.mode === "purge" ? "Purge Hours" : "Discount Hours"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <TextField size="small" label="Hours" type="number" value={hours} onChange={e => setHours(e.target.value)} fullWidth />
            <TextField size="small" label="Minutes" type="number" value={minutes} onChange={e => setMinutes(e.target.value)} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjust(null)}>Cancel</Button>
          <Button variant="contained" disabled={busy} onClick={() => void applyAdjust()}>Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
