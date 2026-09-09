import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button, Box, Chip, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import AddIcon        from "@mui/icons-material/Add"
import EditIcon       from "@mui/icons-material/Edit"
import DeleteIcon     from "@mui/icons-material/Delete"
import SwapHorizIcon  from "@mui/icons-material/SwapHoriz"
import { PageShell }   from "@/components/ui/PageShell"
import { useEffect } from "react"
import { DataGrid }    from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@components/filters/SearchInput"
import { leadsApi }   from "@/api/leads"
import { toast }      from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import { PERMISSIONS }  from "@lib/auth/permissions"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
import { LeadFormDrawer } from "./_components/LeadFormDrawer"

const STATUSES = ["NEW","FOLLOW_UP","PROPOSAL","CONVERTED","CLOSED","WRITE_OFF"]

function LeadFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string,unknown>>(filters)
  return (
    <Box sx={{ display:"flex", flexWrap:"wrap", gap:1.5, alignItems:"flex-end" }}>
      <SearchInput value={String(f.searchText??"")} onChange={v => setF(p => ({...p,searchText:v}))} placeholder="Search leads..." />
      <FormControl size="small" sx={{ minWidth:140 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={String(f.currentStatus??"")} onChange={e => setF(p => ({...p,currentStatus:e.target.value}))}>
          <MenuItem value=""><em>All</em></MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g," ")}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display:"flex", gap:1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function LeadsPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => (s as {hasPermission:(p:string)=>boolean}).hasPermission)
  const canCreate = hasPermission(PERMISSIONS.LEADS_CREATE)
  const canEdit   = hasPermission(PERMISSIONS.LEADS_VIEW)

  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const [editLeadId,  setEditLeadId]  = useState<string>()
  const [deleteId,    setDeleteId]    = useState<string>()
  const [gridKey,     setGridKey]     = useState(0)

  function openCreate() { setEditLeadId(undefined); setDrawerOpen(true) }
  function openEdit(id: string) { setEditLeadId(id); setDrawerOpen(true) }
  function onSaved() { setDrawerOpen(false); setGridKey(k => k+1); toast.success(editLeadId ? "Lead updated" : "Lead created") }

  async function handleWriteOff() {
    if (!deleteId) return
    await leadsApi.writeOff(deleteId)
    setGridKey(k => k+1)
    toast.success("Lead written off")
  }

  return (
    <PageShell
      title="Leads"
      description="Track prospective clients and conversion pipeline"
      action={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Lead</Button> : undefined}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field:"firstName", header:"Name", renderCell:(_,row) => {
            const r = row as Record<string,string>
            return `${r.firstName??""} ${r.lastName??""}`.trim() || r.companyName || "—"
          }},
          { field:"companyName", header:"Company" },
          { field:"currentStatus", header:"Status", renderCell:(v) => <StatusBadge status={String(v??"")} /> },
          { field:"practiceArea",  header:"Practice Area", renderCell:(v) => (v as Record<string,string>)?.name ?? "—" },
          { field:"lawyer",        header:"Attorney", renderCell:(v) => { const u = v as Record<string,string>; return u ? `${u.firstName} ${u.lastName}` : "—" } },
          { field:"createdAt",     header:"Created", renderCell:(v) => v ? new Date(String(v)).toLocaleDateString("en-GB") : "—" },
          { field:"leadType",      header:"Type", renderCell:(v) => <Chip size="small" label={String(v??"")} variant="outlined" /> },
        ]}
        queryKey={["leads","list"]}
        queryFn={(p: GridParams) => leadsApi.getAll(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        FilterPanel={LeadFilters}
        hasFilters syncWithUrl
        detailPath={(row) => `/leads/${(row as Record<string,string>).id}`}
        rowMenuItems={(row) => [
          ...(canEdit ? [{ label:"Edit", icon:<EditIcon fontSize="small" />, onClick:() => openEdit(String((row as Record<string,string>).id)) }] : []),
          { label:"Convert", icon:<SwapHorizIcon fontSize="small" />, onClick:() => navigate(`/leads/${(row as Record<string,string>).id}`) },
          ...(canEdit ? [{ label:"Write Off", icon:<DeleteIcon fontSize="small" />, onClick:() => setDeleteId(String((row as Record<string,string>).id)) }] : []),
        ]}
      />

      <LeadFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        leadId={editLeadId}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        onConfirm={handleWriteOff}
        title="Write Off Lead"
        message="Are you sure you want to write off this lead? This action cannot be undone."
        confirmLabel="Write Off"
        severity="error"
      />
    </PageShell>
  )
}
