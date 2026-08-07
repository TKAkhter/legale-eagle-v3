import { useState } from "react"
import { Button, Box, Chip } from "@mui/material"
import AddIcon   from "@mui/icons-material/Add"
import EditIcon  from "@mui/icons-material/Edit"
import { PageShell }     from "@/components/ui/PageShell"
import { DataGrid }      from "@components/data-grid/DataGrid"
import { StatusBadge }   from "@components/ui/StatusBadge"
import { SearchInput }   from "@components/filters/SearchInput"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { clientsApi }    from "@/api/clients"
import { toast }         from "@/lib/toast"
import { useAuthStore }  from "@lib/store/authStore"
import { PERMISSIONS }   from "@lib/auth/permissions"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
import { ClientFormDrawer } from "./_components/ClientFormDrawer"

function ClientFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [q, setQ] = useState(String(filters.searchText ?? ""))
  return (
    <Box sx={{ display:"flex", gap:1.5, alignItems:"flex-end" }}>
      <SearchInput value={q} onChange={setQ} placeholder="Search clients..." />
      <Button variant="contained" size="small" onClick={() => onSearch({ searchText: q })}>Search</Button>
      <Button size="small" onClick={() => { setQ(""); onReset() }}>Reset</Button>
    </Box>
  )
}

export default function ClientsPage() {
  const hasPermission = useAuthStore(s => (s as {hasPermission:(p:string)=>boolean}).hasPermission)
  const canCreate = hasPermission(PERMISSIONS.CLIENTS_CREATE)

  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [editId,      setEditId]      = useState<string>()
  const [gridKey,     setGridKey]     = useState(0)

  function openCreate() { setEditId(undefined); setDrawerOpen(true) }
  function openEdit(id: string) { setEditId(id); setDrawerOpen(true) }
  function onSaved() { setDrawerOpen(false); setGridKey(k => k+1); toast.success(editId ? "Client updated" : "Client created") }

  return (
    <PageShell
      title="Clients"
      description="Manage firm clients"
      action={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Client</Button> : undefined}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field:"firstName", header:"Name", renderCell:(_,row) => {
            const r = row as Record<string,string>
            return r.clientType === "COMPANY" ? (r.companyName || "—") : `${r.firstName??""} ${r.lastName??""}`.trim() || "—"
          }},
          { field:"clientType", header:"Type",   renderCell:(v) => <Chip size="small" label={String(v??"")} variant="outlined" /> },
          { field:"email",      header:"Email",  renderCell:(v) => String(v??"—") },
          { field:"phone",      header:"Phone",  renderCell:(v) => String(v??"—") },
          { field:"active",     header:"Status", renderCell:(v) => <StatusBadge status={v ? "active" : "inactive"} /> },
        ]}
        queryKey={["clients","list"]}
        queryFn={(p: GridParams) => clientsApi.getAll(p) as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        FilterPanel={ClientFilters}
        hasFilters syncWithUrl
        detailPath={(row) => `/clients/${(row as Record<string,string>).id}`}
        rowMenuItems={(row) => [
          { label:"Edit", icon:<EditIcon fontSize="small" />, onClick:() => openEdit(String((row as Record<string,string>).id)) },
        ]}
      />
      <ClientFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} clientId={editId} onSaved={onSaved} />
    </PageShell>
  )
}
