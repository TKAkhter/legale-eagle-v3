import { useState } from "react"
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { leavesApi } from "@/api/leaves"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function LeaveApplicationsPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState("Accepted")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function process() {
    if (!selected?.id) return
    setSubmitting(true)
    setError(null)
    try {
      toast.success(await leavesApi.process(String(selected.id), {
        leaveStatus: status,
        note,
      }))
      setSelected(null)
      setNote("")
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
      title="Leave Applications"
      description="Review and process team leave requests"
      breadcrumbs={[
        { label: "My Leaves", path: "/leaves" },
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
            renderCell: (v, row) => {
              if (typeof v === "string" && v) return v
              const u = (row as Record<string, unknown>).leaveTakenBy as Record<string, string> | undefined
              return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
            },
          },
          { field: "fromDate", header: "From", renderCell: v => formatDate(String(v ?? "")) },
          { field: "toDate", header: "To", renderCell: v => formatDate(String(v ?? "")) },
          {
            field: "leaveType",
            header: "Type",
            renderCell: (v) => {
              const t = v as { type?: string } | string | undefined
              if (typeof t === "string") return t
              return String(t?.type ?? "—")
            },
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
        zebraStriping
        rowMenuItems={(row) => {
          const statusVal = String((row as { leaveStatus?: string }).leaveStatus ?? "")
          if (statusVal !== "Submitted") return []
          return [
            { label: "Process", onClick: () => { setSelected(row as Record<string, unknown>); setStatus("Accepted"); setNote("") } },
          ]
        }}
      />

      <Dialog open={!!selected} onClose={() => !submitting && setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Leave Application</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              select size="small" label="Decision" value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <MenuItem value="Accepted">Accept</MenuItem>
              <MenuItem value="Rejected">Reject</MenuItem>
            </TextField>
            <TextField
              size="small" label="Note" multiline rows={2}
              value={note} onChange={e => setNote(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={process} disabled={submitting}>
            {submitting ? "Saving…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
