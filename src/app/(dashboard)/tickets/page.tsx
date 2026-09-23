import { useMemo, useState } from "react"
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Tab, Tabs, TextField,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ticketsApi } from "@/api/tickets"
import { toast } from "@/lib/toast"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

export default function TicketsPage() {
  const [tab, setTab] = useState(0)
  const [gridKey, setGridKey] = useState(0)
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [form, setForm] = useState({ title: "", issueRelatedTo: "", description: "", url: "" })
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
    await ticketsApi.create({
      title: form.title,
      issueRelatedTo: form.issueRelatedTo,
      description: form.description,
      url: form.url || window.location.href,
    })
    toast.success("Ticket raised")
    setRaiseOpen(false)
    setForm({ title: "", issueRelatedTo: "", description: "", url: "" })
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title="Raised Tickets"
      description="Track support tickets raised from the application"
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
          <TextField
            label="Related To"
            size="small"
            fullWidth
            value={form.issueRelatedTo}
            onChange={e => setForm(f => ({ ...f, issueRelatedTo: e.target.value }))}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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
