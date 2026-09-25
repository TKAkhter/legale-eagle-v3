import { useEffect, useMemo, useState } from "react"
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Select,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import CallSplitIcon from "@mui/icons-material/CallSplit"
import EditIcon from "@mui/icons-material/Edit"
import LocalOfferIcon from "@mui/icons-material/LocalOffer"
import MergeIcon from "@mui/icons-material/Merge"
import MergeTypeIcon from "@mui/icons-material/MergeType"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { billingApi } from "@/api/billing"
import { timelogsApi } from "@/api/timelogs"
import { env } from "@/config/env"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { ActivityFormDrawer } from "../../../time-log-entries/_components/ActivityFormDrawer"

interface Props {
  open: boolean
  onClose: () => void
  approval: Record<string, unknown> | null
  onDone: () => void
}

type AdjustMode = "purge" | "discount"

type AttorneyOpt = { id: string; label: string }

function formatHm(hours: number, minutes: number): string {
  if (!hours && !minutes) return "0:00"
  return `${hours}:${String(minutes).padStart(2, "0")}`
}

function activityRowId(row: Record<string, unknown>, index: number): string {
  return String(row.id ?? row.activityId ?? `act-${index}`)
}

function apiErrMsg(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: { Msg?: string; message?: string; code?: string } } })?.response?.data
  const msg = data?.Msg ?? data?.message
  if (msg) return String(msg)
  if (e instanceof Error && e.message) return e.message
  return fallback
}

/**
 * LMS modify/List processActivities — fold purge/discount children into parents
 * and hide pure child rows. Enables Merge / Merge Discount actions.
 */
function processModifyAllActivities(raw: unknown[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>()
  for (const item of raw) {
    const a = { ...((item ?? {}) as Record<string, unknown>) }
    const aid = String(a.activityId ?? a.id ?? "")
    if (!aid) continue
    byId.set(aid, a)
  }

  for (const item of raw) {
    const a = (item ?? {}) as Record<string, unknown>
    if (!a) continue

    if (a.purgeFromId != null && a.purgeFromId !== "") {
      const parent = byId.get(String(a.purgeFromId))
      if (parent) {
        parent.unBilledHours = a.hours
        parent.unBilledMinutes = a.minutes
        parent.unBilledActivityId = a.activityId ?? a.id
        parent.isPurged = true
      }
    }

    if (a.discountFromId != null && a.discountFromId !== "") {
      const parent = byId.get(String(a.discountFromId))
      if (parent) {
        parent.discountedActivityId = a.activityId ?? a.id
        parent.discountedHours = a.hours
        parent.discountedMinutes = a.minutes
        parent.isDiscounted = true
      }
    }
  }

  const merged = Array.from(byId.values()).filter(
    item => !item.purgeFromId && !item.discountFromId,
  )

  return merged.map((a, index) => {
    const hours = Number(a.hours ?? a.totalHours ?? 0)
    const minutes = Number(a.minutes ?? 0)
    const isPurged = a.isPurged === true || a.purge === true
    const isDiscounted = a.isDiscounted === true || a.discount === true || !!a.discountedActivityId
    return {
      ...a,
      id: activityRowId(a, index),
      activityId: a.activityId ?? a.id,
      description: String(a.note ?? a.activity ?? a.activityName ?? a.description ?? a.name ?? `Line ${index + 1}`),
      hours,
      minutes,
      amount: Number(a.billing ?? a.amount ?? a.rate ?? 0),
      entryDate: a.entryDate ?? a.createdAt ?? a.date,
      purge: isPurged,
      isPurged,
      isDiscounted,
      editable: a.editable !== false,
      unBilledHours: Number(a.unBilledHours ?? 0),
      unBilledMinutes: Number(a.unBilledMinutes ?? 0),
      unBilledActivityId: a.unBilledActivityId,
      discountedHours: Number(a.discountedHours ?? 0),
      discountedMinutes: Number(a.discountedMinutes ?? 0),
      discountedActivityId: a.discountedActivityId,
    }
  })
}

/** Normalize invoice activity rows for the review grid (non–ModifyAll). */
function normalizeActivityRows(raw: unknown[]): Record<string, unknown>[] {
  return raw.map((item, index) => {
    const a = (item ?? {}) as Record<string, unknown>
    const hours = Number(a.hours ?? a.totalHours ?? 0)
    const minutes = Number(a.minutes ?? 0)
    return {
      ...a,
      id: activityRowId(a, index),
      description: String(a.note ?? a.activity ?? a.activityName ?? a.description ?? a.name ?? `Line ${index + 1}`),
      hours,
      minutes,
      amount: Number(a.billing ?? a.amount ?? a.rate ?? 0),
      entryDate: a.entryDate ?? a.createdAt ?? a.date,
      purge: a.purge === true,
      editable: a.editable !== false,
    }
  })
}

/**
 * LMS ApproveInvoice / ModifyAll depth — attorney pick, invoice activity grid
 * (from billing getById), edit drawer, purge/discount (split) + merge restore,
 * approve/reject. Deep-link covers invoice edit.
 */
export function InvoiceApprovalReviewDialog({ open, onClose, approval, onDone }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [adjust, setAdjust] = useState<{ id: string; mode: AdjustMode } | null>(null)
  const [hours, setHours] = useState("0")
  const [minutes, setMinutes] = useState("0")
  const [selectedAttorneyId, setSelectedAttorneyId] = useState("")
  const [editActivityId, setEditActivityId] = useState<string | undefined>()

  const invoiceId = String(
    approval?.invoiceId
    ?? (approval?.invoice as { id?: string } | undefined)?.id
    ?? "",
  )
  const fallbackAttorneyId = String(approval?.attorneyId ?? approval?.userId ?? "")

  const attorneysQuery = useQuery({
    queryKey: ["invoice-approval", "attorneys", invoiceId],
    enabled: open && !!invoiceId && !env.USE_STATIC_DATA,
    queryFn: async (): Promise<AttorneyOpt[]> => {
      const res = await axiosClient.get("/api/invoice/responsible/attorney", { params: { invoiceId } })
      const raw = res.data?.data ?? res.data ?? []
      const list = Array.isArray(raw) ? raw : []
      return list.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? ""),
        label: `${String(a.firstName ?? "")} ${String(a.lastName ?? "")}`.trim() || String(a.id ?? "Attorney"),
      })).filter(a => a.id)
    },
  })

  useEffect(() => {
    if (!open) return
    setReason("")
    setError("")
    setAdjust(null)
    setEditActivityId(undefined)
    const first = attorneysQuery.data?.[0]?.id
    setSelectedAttorneyId(fallbackAttorneyId || first || "")
  }, [open, fallbackAttorneyId, attorneysQuery.data])

  const attorneyId = selectedAttorneyId || fallbackAttorneyId

  const detailQuery = useQuery({
    queryKey: ["invoice-approval", "detail", invoiceId || approval?.id],
    enabled: open && !!(invoiceId || approval?.id),
    queryFn: async () => {
      const id = invoiceId || String(approval?.id ?? "")
      if (!id) return approval ?? {}
      try {
        return await billingApi.getById(id)
      } catch {
        return approval ?? {}
      }
    },
  })

  /** Fallback when getById has no embedded activities array. */
  const invoiceActivitiesFallbackQuery = useQuery({
    queryKey: ["invoice-approval", "invoice-activities-fallback", invoiceId],
    enabled: open && !!invoiceId && detailQuery.isSuccess && (() => {
      const detail = (detailQuery.data ?? {}) as Record<string, unknown>
      const hasActs = Array.isArray(detail.activities) && detail.activities.length > 0
      const hasItems = Array.isArray(detail.activityItems) && detail.activityItems.length > 0
      return !hasActs && !hasItems
    })(),
    queryFn: () => billingApi.getActivitiesByInvoice(invoiceId),
  })

  const linesQuery = useQuery({
    queryKey: ["invoice-approval", "lines", invoiceId, attorneyId],
    enabled: open && !!invoiceId && (!!attorneyId || env.USE_STATIC_DATA),
    queryFn: () => timelogsApi.getByInvoice(invoiceId, attorneyId || undefined),
  })

  const invoiceActivities = useMemo(() => {
    const detail = (detailQuery.data ?? {}) as Record<string, unknown>
    const fromDetail = Array.isArray(detail.activities)
      ? (detail.activities as unknown[])
      : Array.isArray(detail.activityItems)
        ? (detail.activityItems as unknown[])
        : []
    if (fromDetail.length > 0) return normalizeActivityRows(fromDetail)

    const fallback = invoiceActivitiesFallbackQuery.data
    if (Array.isArray(fallback) && fallback.length > 0) {
      return normalizeActivityRows(fallback as unknown[])
    }

    const lineItems = Array.isArray(detail.lineItems) ? (detail.lineItems as unknown[]) : []
    return normalizeActivityRows(lineItems)
  }, [detailQuery.data, invoiceActivitiesFallbackQuery.data])

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
    } catch (e) {
      setError(apiErrMsg(e, "Action failed"))
    } finally {
      setBusy(false)
    }
  }

  async function applyAdjust() {
    if (!adjust || !invoiceId) return
    if (!attorneyId && !env.USE_STATIC_DATA) {
      toast.error("Select an attorney before purge/discount")
      return
    }
    setBusy(true)
    try {
      const body = { billedHours: Number(hours) || 0, billedMinutes: Number(minutes) || 0 }
      if (adjust.mode === "purge") toast.success(await timelogsApi.purgeForInvoice(invoiceId, adjust.id, body))
      else toast.success(await timelogsApi.discountForInvoice(invoiceId, adjust.id, body))
      setAdjust(null)
      refreshActivities()
    } catch (e) {
      toast.error(apiErrMsg(e, adjust.mode === "purge" ? "Purge failed" : "Discount failed"))
    } finally {
      setBusy(false)
    }
  }

  async function mergePurge(line: Record<string, unknown>) {
    const childId = String(line.unBilledActivityId ?? "")
    if (!childId) {
      toast.error("No purged child activity to merge")
      return
    }
    setBusy(true)
    try {
      toast.success(await timelogsApi.mergePurge(childId))
      refreshActivities()
    } catch (e) {
      toast.error(apiErrMsg(e, "Merge purged hours failed"))
    } finally {
      setBusy(false)
    }
  }

  async function mergeDiscount(line: Record<string, unknown>) {
    const childId = String(line.discountedActivityId ?? line.activityId ?? line.id ?? "")
    if (!childId) {
      toast.error("No discounted activity to merge")
      return
    }
    setBusy(true)
    try {
      toast.success(await timelogsApi.mergeDiscount(childId))
      refreshActivities()
    } catch (e) {
      toast.error(apiErrMsg(e, "Merge discounted hours failed"))
    } finally {
      setBusy(false)
    }
  }

  function openInvoiceActivities() {
    if (!invoiceId) return
    onClose()
    navigate(`/billings/${invoiceId}`)
  }

  function refreshActivities() {
    void qc.invalidateQueries({ queryKey: ["invoice-approval", "lines", invoiceId] })
    void qc.invalidateQueries({ queryKey: ["invoice-approval", "invoice-activities-fallback", invoiceId] })
    void qc.invalidateQueries({ queryKey: ["invoice-approval", "detail", invoiceId || approval?.id] })
  }

  const d = (detailQuery.data ?? approval ?? {}) as Record<string, unknown>
  const attorneyLines = useMemo(
    () => processModifyAllActivities((linesQuery.data ?? []) as unknown[]),
    [linesQuery.data],
  )
  const attorneyOpts: AttorneyOpt[] = env.USE_STATIC_DATA
    ? [{ id: "att1", label: "Sarah Johnson" }]
    : (attorneysQuery.data ?? [])

  const loadingActivities = detailQuery.isLoading
    || (detailQuery.isSuccess && invoiceActivitiesFallbackQuery.isLoading && invoiceActivities.length === 0)

  function renderAttorneyLine(line: Record<string, unknown>, i: number) {
    const id = activityRowId(line, i)
    const canMergePurge = line.isPurged === true && !!line.unBilledActivityId
    const canMergeDiscount = line.isDiscounted === true
      || !!line.discountedActivityId
      || line.discount === true
    const unBilled = formatHm(Number(line.unBilledHours), Number(line.unBilledMinutes))
    const discounted = formatHm(Number(line.discountedHours), Number(line.discountedMinutes))

    return (
      <Box
        key={id}
        sx={{
          display: "flex", justifyContent: "space-between", gap: 1, py: 1,
          borderBottom: "1px solid", borderColor: "divider", alignItems: "center", flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(line.description)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatHm(Number(line.hours), Number(line.minutes))}h
            {" · "}
            {formatCurrency(Number(line.amount))}
            {line.isPurged === true && Number(line.unBilledHours) + Number(line.unBilledMinutes) > 0 && (
              <> · Non-bill purged {unBilled}</>
            )}
            {canMergeDiscount && Number(line.discountedHours) + Number(line.discountedMinutes) > 0 && (
              <> · Discounted {discounted}</>
            )}
          </Typography>
        </Box>
        {!!invoiceId && (
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <IconButton size="small" title="Edit time log" onClick={() => setEditActivityId(id)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              title="Deduct time as non-billable (split/purge)"
              disabled={busy}
              onClick={() => { setAdjust({ id, mode: "purge" }); setHours("0"); setMinutes("0") }}
            >
              <CallSplitIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
            </IconButton>
            <IconButton
              size="small"
              title="Increase time as billable (merge purge)"
              disabled={busy || !canMergePurge}
              onClick={() => void mergePurge(line)}
            >
              <MergeIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
            </IconButton>
            <IconButton
              size="small"
              title="Discount hours"
              disabled={busy || line.editable === false}
              onClick={() => { setAdjust({ id, mode: "discount" }); setHours("0"); setMinutes("0") }}
            >
              <LocalOfferIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              title="Merge discount hours"
              disabled={busy || !canMergeDiscount}
              onClick={() => void mergeDiscount(line)}
            >
              <MergeTypeIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          Review Invoice Approval
          {!!invoiceId && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={openInvoiceActivities}
              >
                Open invoice activities
              </Button>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Invoice #</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {String(d.taxInvoiceNo ?? d.invoiceNo ?? approval?.invoiceNo ?? "—")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(Number(d.taxableAmount ?? d.dueAmount ?? approval?.taxableAmount ?? 0))}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Client</Typography>
              <Typography variant="body2">
                {String(
                  d.clientName
                  ?? (d.client as { companyName?: string } | undefined)?.companyName
                  ?? (approval?.client as { companyName?: string } | undefined)?.companyName
                  ?? "—",
                )}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Issued</Typography>
              <Typography variant="body2">
                {d.issueDate || approval?.issueDate
                  ? formatDate(String(d.issueDate ?? approval?.issueDate))
                  : "—"}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Invoice activities
              {invoiceActivities.length > 0 && (
                <Chip size="small" label={invoiceActivities.length} sx={{ ml: 1 }} />
              )}
            </Typography>
            {!!invoiceId && (
              <Button size="small" onClick={openInvoiceActivities} startIcon={<OpenInNewIcon />}>
                Open on invoice
              </Button>
            )}
          </Box>
          {loadingActivities && <LinearProgress sx={{ mb: 1 }} />}
          {!loadingActivities && !invoiceActivities.length && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No activity lines on this invoice.
              {!!invoiceId && " Use Open invoice activities to review or edit on the billing detail page."}
            </Typography>
          )}
          {invoiceActivities.length > 0 && (
            <Box sx={{ maxHeight: 260, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 88 }}>Hours</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 110 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 110 }}>Entry</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: 56 }} align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceActivities.map((row, i) => {
                    const id = activityRowId(row, i)
                    return (
                      <TableRow key={id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {String(row.description)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatHm(Number(row.hours), Number(row.minutes))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(Number(row.amount))}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {row.entryDate ? formatDate(String(row.entryDate)) : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            title="Edit activity"
                            disabled={row.editable === false}
                            onClick={() => setEditActivityId(id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          )}

          {!!invoiceId && (
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel id="inv-appr-attorney">Attorney time log (ModifyAll)</InputLabel>
              <Select
                labelId="inv-appr-attorney"
                label="Attorney time log (ModifyAll)"
                value={selectedAttorneyId || attorneyOpts[0]?.id || ""}
                onChange={e => setSelectedAttorneyId(String(e.target.value))}
              >
                {attorneyOpts.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.label}</MenuItem>
                ))}
                {!attorneyOpts.length && fallbackAttorneyId && (
                  <MenuItem value={fallbackAttorneyId}>Selected attorney</MenuItem>
                )}
              </Select>
            </FormControl>
          )}

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Attorney time lines (ModifyAll)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Split = purge/discount hours · Merge restores purged or discounted child hours to the parent.
          </Typography>
          {!attorneyId && !env.USE_STATIC_DATA && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select an attorney to load purge/discount/merge lines
            </Typography>
          )}
          {linesQuery.isLoading && <LinearProgress sx={{ mb: 1 }} />}
          {!attorneyLines.length && !linesQuery.isLoading && !!attorneyId && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No attorney time lines</Typography>
          )}
          {attorneyLines.map((line, i) => renderAttorneyLine(line, i))}

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
        <DialogTitle>{adjust?.mode === "purge" ? "Purge Hours (Split)" : "Discount Hours"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Billing hours remaining after {adjust?.mode === "purge" ? "purge" : "discount"}
            {attorneyOpts.find(a => a.id === attorneyId)?.label
              ? ` — ${attorneyOpts.find(a => a.id === attorneyId)?.label}`
              : attorneyId ? ` — ${attorneyId}` : ""}.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <TextField size="small" label="Hours" type="number" value={hours} onChange={e => setHours(e.target.value)} fullWidth />
            <TextField size="small" label="Minutes" type="number" value={minutes} onChange={e => setMinutes(e.target.value)} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjust(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={busy || (!attorneyId && !env.USE_STATIC_DATA)}
            onClick={() => void applyAdjust()}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <ActivityFormDrawer
        open={!!editActivityId}
        onClose={() => setEditActivityId(undefined)}
        activityId={editActivityId}
        onSuccess={() => {
          setEditActivityId(undefined)
          refreshActivities()
        }}
      />
    </>
  )
}
