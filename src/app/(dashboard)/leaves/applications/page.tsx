import { useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography,
} from "@mui/material"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { Link as RouterLink } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { StatusFilter } from "@components/filters/StatusFilter"
import { leavesApi } from "@/api/leaves"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { FilterPanelProps, RowMenuItem } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"

const LEAVE_STATUS_OPTIONS = [
  { value: "Submitted", label: "Submitted" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
]

function LeaveStatusFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <StatusFilter
        label="Status"
        value={String(f.leaveStatus ?? "All")}
        onChange={v => setF(p => ({ ...p, leaveStatus: v }))}
        options={LEAVE_STATUS_OPTIONS}
        includeAll
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

function employeeName(row: Record<string, unknown>): string {
  const name = row.leaveTakenByName
  if (typeof name === "string" && name.trim()) return name
  const u = row.leaveTakenBy as Record<string, string> | undefined
  if (u) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"
  return "—"
}

function leaveTypeLabel(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const t = v as { type?: string } | undefined
  return String(t?.type ?? "—")
}

type ActionMode = "Accepted" | "Rejected"

export default function LeaveApplicationsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [actionRow, setActionRow] = useState<Record<string, unknown> | null>(null)
  const [mode, setMode] = useState<ActionMode>("Accepted")
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAction(row: Record<string, unknown>, approve: boolean) {
    setActionRow(row)
    setMode(approve ? "Accepted" : "Rejected")
    setRemarks("")
    setError(null)
  }

  async function submitAction() {
    if (!actionRow?.id) return
    if (!remarks.trim()) {
      setError("Remarks are required")
      toast.error("Add Remarks.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      toast.success(await leavesApi.process(String(actionRow.id), {
        leaveStatus: mode,
        note: remarks.trim(),
      }))
      setActionRow(null)
      setRemarks("")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["leaves"] })
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to process leave",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title={t("nav.leaveApplications")}
      description={t("pages.leaveApplicationsDesc")}
      breadcrumbs={[
        { label: t("nav.myLeaves"), path: "/leaves" },
        { label: "Applications" },
      ]}
      action={(
        <Button component={RouterLink} to="/leaves" variant="outlined">
          My Leaves
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "leaveTakenByName",
            header: "Employee",
            renderCell: (_v, row) => employeeName(row as Record<string, unknown>),
          },
          { field: "fromDate", header: "From", renderCell: v => formatDate(String(v ?? "")) },
          { field: "toDate", header: "To", renderCell: v => formatDate(String(v ?? "")) },
          {
            field: "leaveType",
            header: "Type",
            renderCell: (v, row) => leaveTypeLabel(v ?? (row as Record<string, unknown>).leaveType),
          },
          { field: "description", header: "Description", renderCell: v => String(v || "—") },
          {
            field: "leaveStatus",
            header: "Status",
            renderCell: v => <StatusBadge status={String(v ?? "")} />,
          },
        ]}
        queryKey={["leaves", "applications"]}
        queryFn={(p: GridParams) => leavesApi.getApplications(p)}
        hasFilters
        FilterPanel={LeaveStatusFilterPanel}
        zebraStriping
        onRowClick={row => setDetail(row as Record<string, unknown>)}
        rowMenuItems={(row) => {
          const r = row as Record<string, unknown>
          const statusVal = String(r.leaveStatus ?? "")
          const items: RowMenuItem<Record<string, unknown>>[] = [
            {
              label: "Details",
              icon: <VisibilityIcon fontSize="small" />,
              onClick: () => setDetail(r),
            },
          ]
          if (statusVal === "Submitted") {
            items.push(
              {
                label: "Approve",
                icon: <CheckIcon fontSize="small" />,
                onClick: () => openAction(r, true),
              },
              {
                label: "Reject",
                icon: <CloseIcon fontSize="small" />,
                color: "error",
                onClick: () => openAction(r, false),
              },
            )
          }
          return items
        }}
      />

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Application</DialogTitle>
        <DialogContent>
          {detail && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 0.5 }}>
              <Typography variant="body2"><strong>Employee:</strong> {employeeName(detail)}</Typography>
              <Typography variant="body2"><strong>Type:</strong> {leaveTypeLabel(detail.leaveType)}</Typography>
              <Typography variant="body2">
                <strong>From:</strong> {formatDate(String(detail.fromDate ?? ""))}
              </Typography>
              <Typography variant="body2">
                <strong>To:</strong> {formatDate(String(detail.toDate ?? ""))}
              </Typography>
              <Typography variant="body2"><strong>Description:</strong> {String(detail.description || "—")}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" component="span"><strong>Status:</strong></Typography>
                <StatusBadge status={String(detail.leaveStatus ?? "")} />
              </Box>
              {detail.note != null && String(detail.note).trim() !== "" && (
                <Typography variant="body2"><strong>Remarks:</strong> {String(detail.note)}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {detail && String(detail.leaveStatus ?? "") === "Submitted" && (
            <>
              <Button
                color="primary"
                onClick={() => { setDetail(null); openAction(detail, true) }}
              >
                Approve
              </Button>
              <Button
                color="error"
                onClick={() => { setDetail(null); openAction(detail, false) }}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!actionRow} onClose={() => !submitting && setActionRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === "Accepted" ? "Approve Leave" : "Reject Leave"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          {actionRow && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {mode === "Accepted" ? "Approve" : "Reject"}: {employeeName(actionRow)}
                {" · "}
                {formatDate(String(actionRow.fromDate ?? ""))}
                {" – "}
                {formatDate(String(actionRow.toDate ?? ""))}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </>
          )}
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={4}
            label="Remarks"
            required
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            helperText="Required"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionRow(null)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            color={mode === "Accepted" ? "primary" : "error"}
            onClick={() => void submitAction()}
            disabled={submitting || !remarks.trim()}
          >
            {submitting ? "Saving…" : mode === "Accepted" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
