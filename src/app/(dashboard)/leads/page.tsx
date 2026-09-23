import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput, PracticeAreaFilter, DateRangeFilter, FilterActions } from "@components/filters"
import { leadsApi } from "@/api/leads"
import { toast } from "@/lib/toast"
import { formatDate } from "@lib/utils/formatDate"
import { useAuthStore } from "@lib/store/authStore"
import { PERMISSIONS } from "@lib/auth/permissions"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
import { LeadFormDrawer } from "./_components/LeadFormDrawer"

function LeadFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>({
    type: "All",
    statusGroup: "Open",
    ...filters,
  })
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={String(f.type ?? "All")}
        onChange={(_, value) => value && setF(p => ({ ...p, type: value }))}
      >
        {["All", "People", "Company"].map(item => (
          <ToggleButton key={item} value={item}>{item === "People" ? "Individual" : item}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={String(f.statusGroup ?? "Open")}
        onChange={(_, value) => value && setF(p => ({ ...p, statusGroup: value }))}
      >
        {[
          { label: "All", value: "All" },
          { label: "Open", value: "Open" },
          { label: "Converted", value: "Converted" },
          { label: "Written Off", value: "Writeoff" },
        ].map(item => (
          <ToggleButton key={item.value} value={item.value}>{item.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
        <SearchInput
          value={String(f.searchText ?? "")}
          onChange={v => setF(p => ({ ...p, searchText: v }))}
          placeholder="Search by name..."
        />
        <PracticeAreaFilter
          value={String(f.practiceArea ?? "")}
          onChange={v => setF(p => ({ ...p, practiceArea: v }))}
        />
        <TextField
          size="small"
          label="Source Type"
          value={String(f.sourceType ?? "")}
          onChange={e => setF(p => ({ ...p, sourceType: e.target.value }))}
        />
        <DateRangeFilter
          fromDate={String(f.fromDate ?? "")}
          toDate={String(f.toDate ?? "")}
          onChange={v => setF(p => ({ ...p, ...v }))}
        />
        <FilterActions
          onSearch={() => onSearch(f)}
          onClear={() => { setF({ type: "All", statusGroup: "Open" }); onReset() }}
        />
      </Box>
    </Box>
  )
}

export default function LeadsPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission(PERMISSIONS.LEADS_CREATE)
  const canEdit = hasPermission(PERMISSIONS.LEADS_VIEW)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [editLeadId, setEditLeadId] = useState<string>()
  const [writeOffId, setWriteOffId] = useState<string>()
  const [writeOffReason, setWriteOffReason] = useState("")
  const [reopenId, setReopenId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Dashboard deep-links: /leads?status=Open|Converted|Writeoff
  const urlStatus = searchParams.get("status")
  const initialStatusGroup = urlStatus === "Write_Off" || urlStatus === "Written Off"
    ? "Writeoff"
    : (urlStatus || undefined)

  const reasonsQuery = useQuery({
    queryKey: ["leads", "writeoff-reasons"],
    queryFn: () => leadsApi.getWriteOffReasons(),
    enabled: !!writeOffId,
  })

  async function confirmWriteOff() {
    if (!writeOffId) return
    await leadsApi.writeOff(writeOffId, writeOffReason)
    setWriteOffId(undefined)
    setWriteOffReason("")
    setGridKey(k => k + 1)
    toast.success("Lead written off")
  }

  async function confirmReopen() {
    if (!reopenId) return
    toast.success(await leadsApi.reopen(reopenId))
    setReopenId(undefined)
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title="Leads"
      description="Track prospective clients and conversion pipeline"
      action={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditLeadId(undefined); setDrawerOpen(true) }}>New Lead</Button> : undefined}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "name", header: "Name", renderCell: v => String(v || "—") },
          { field: "email", header: "Contact", renderCell: (_, row) => {
            const r = row as { email?: string; phone?: string }
            return [r.email, r.phone].filter(Boolean).join(" · ") || "—"
          }},
          { field: "status", header: "Lead Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "lastStatusUpdatedDate", header: "Last Status Update", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "leadSource", header: "Lead Source", renderCell: v => String(v || "—") },
          { field: "practiceArea", header: "Practice Area", renderCell: v => String(v || "—") },
          { field: "dispute", header: "Dispute", renderCell: v => String(v || "—") },
          { field: "followUp", header: "Follow Up", renderCell: v => String(v || "—") },
          { field: "conflictCheckStatus", header: "Conflict", renderCell: v => <Chip size="small" label={String(v || "—")} variant="outlined" /> },
          { field: "attorneyName", header: "Allotted Lawyer", renderCell: v => String(v || "—") },
          { field: "createdBy", header: "Created By", renderCell: v => String(v || "—") },
          { field: "partyOpposing", header: "Party Opposing", renderCell: v => String(v || "—") },
          { field: "createdAt", header: "Created Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "leadType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
        ]}
        queryKey={["leads", "list"]}
        queryFn={(p: GridParams) => leadsApi.getAll({
          ...p,
          filters: {
            type: "All",
            statusGroup: initialStatusGroup ?? "Open",
            ...p.filters,
            ...(initialStatusGroup && !p.filters?.statusGroup ? { statusGroup: initialStatusGroup } : {}),
          },
        })}
        FilterPanel={LeadFilters}
        hasFilters
        syncWithUrl
        isSortingBackend={false}
        defaultPageSize={10}
        detailPath={row => `/leads/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const r = row as { id?: string; status?: string }
          const id = String(r.id ?? "")
          const status = String(r.status ?? "")
          const writtenOff = ["WRITE_OFF", "Writeoff"].includes(status)
          return [
            { label: "Details", onClick: () => navigate(`/leads/${id}`) },
            ...(canEdit ? [{ label: "Edit", icon: <EditIcon fontSize="small" />, onClick: () => { setEditLeadId(id); setDrawerOpen(true) } }] : []),
            { label: "Convert / Close", icon: <SwapHorizIcon fontSize="small" />, onClick: () => navigate(`/leads/${id}`) },
            ...(canEdit && !writtenOff ? [{ label: "Write Off", icon: <DeleteIcon fontSize="small" />, onClick: () => setWriteOffId(id) }] : []),
            ...(canEdit && writtenOff ? [{ label: "Reopen", icon: <RestartAltIcon fontSize="small" />, onClick: () => setReopenId(id) }] : []),
          ]
        }}
      />

      <LeadFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        leadId={editLeadId}
        onSaved={() => { setDrawerOpen(false); setGridKey(k => k + 1); toast.success(editLeadId ? "Lead updated" : "Lead created") }}
      />

      <Dialog open={!!writeOffId} onClose={() => setWriteOffId(undefined)} fullWidth maxWidth="xs">
        <DialogTitle>Write Off Lead</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={writeOffReason} onChange={e => setWriteOffReason(e.target.value)}>
              {(reasonsQuery.data ?? []).map(reason => (
                <MenuItem key={reason.id} value={reason.name}>{reason.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWriteOffId(undefined)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!writeOffReason} onClick={confirmWriteOff}>Write Off</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!reopenId}
        onClose={() => setReopenId(undefined)}
        onConfirm={confirmReopen}
        title="Reopen Lead"
        message="Are you sure you want to reopen this lead?"
        confirmLabel="Reopen"
      />
    </PageShell>
  )
}
