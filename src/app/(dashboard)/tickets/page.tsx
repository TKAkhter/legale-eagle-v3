import { useMemo, useState } from "react"
import {
  Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Tab, Tabs, TextField,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ticketsApi } from "@/api/tickets"
import { toast } from "@/lib/toast"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

const RELATED_OPTIONS = ["Lead", "Matter", "Billing", "Task", "Hearing"] as const

export default function TicketsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)
  const [gridKey, setGridKey] = useState(0)
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [form, setForm] = useState({ title: "", issueRelatedTo: "", note: "", url: "" })
  const completed = tab === 1

  const columns = useMemo(() => [
    { field: "createdByName", header: "Created By", renderCell: (v: unknown) => String(v || "—") },
    { field: "createdDate", header: "Created Date", renderCell: (v: unknown) => v ? formatDate(String(v)) : "—" },
    { field: "issueRelatedTo", header: "Related To", renderCell: (v: unknown) => String(v || "—") },
    { field: "title", header: "Title", renderCell: (v: unknown) => String(v || "—") },
    {
      field: "url",
      header: "Url",
      renderCell: (v: unknown) => {
        const href = String(v || "")
        if (!href) return "—"
        return (
          <Chip
            size="small"
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            label={href.length > 40 ? `${href.slice(0, 40)}…` : href}
            variant="outlined"
            onClick={e => e.stopPropagation()}
          />
        )
      },
    },
    { field: "status", header: "Status", renderCell: (v: unknown) => <StatusBadge status={String(v ?? "")} /> },
  ], [])

  async function submitTicket() {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!form.issueRelatedTo) {
      toast.error("Related To is required")
      return
    }
    if (!form.note.trim()) {
      toast.error("Note is required")
      return
    }
    await ticketsApi.create({
      title: form.title,
      issueRelatedTo: form.issueRelatedTo,
      note: form.note,
      url: form.url || window.location.href,
    })
    toast.success("Ticket raised")
    setRaiseOpen(false)
    setForm({ title: "", issueRelatedTo: "", note: "", url: "" })
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title={t("nav.raisedTickets")}
      description={t("pages.ticketsDesc")}
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRaiseOpen(true)}>
          Raise Ticket
        </Button>
      )}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setGridKey(k => k + 1) }}
        sx={{ mb: 2, minHeight: 40, "& .MuiTab-root": { textTransform: "none", minHeight: 40 } }}
      >
        <Tab label="Pending" />
        <Tab label="Completed" />
      </Tabs>

      <DataGrid
        key={gridKey}
        columns={columns}
        queryKey={["tickets", completed ? "completed" : "pending"]}
        queryFn={(p: GridParams) => ticketsApi.getAll(p, completed)}
        defaultPageSize={10}
        isSortingBackend={false}
        detailPath={row => `/tickets/${String((row as { id?: string }).id ?? "")}`}
      />

      <Dialog open={raiseOpen} onClose={() => setRaiseOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise Ticket</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            size="small"
            fullWidth
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="ticket-related-label">Related To</InputLabel>
            <Select
              labelId="ticket-related-label"
              label="Related To"
              value={form.issueRelatedTo}
              onChange={e => setForm(f => ({ ...f, issueRelatedTo: String(e.target.value) }))}
            >
              {RELATED_OPTIONS.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Note"
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
          <TextField
            label="URL"
            size="small"
            fullWidth
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder={typeof window !== "undefined" ? window.location.href : ""}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRaiseOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitTicket}>Submit</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
