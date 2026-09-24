import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Chip, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { SearchInput } from "@components/filters/SearchInput"
import { leadsApi } from "@/api/leads"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

function MyLeadFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>({ type: "All", statusGroup: "Open", ...filters })
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ToggleButtonGroup exclusive size="small" value={String(f.type ?? "All")} onChange={(_, v) => v && setF(p => ({ ...p, type: v }))}>
        {["All", "Individual", "Company"].map(item => <ToggleButton key={item} value={item}>{item}</ToggleButton>)}
      </ToggleButtonGroup>
      <ToggleButtonGroup exclusive size="small" value={String(f.statusGroup ?? "Open")} onChange={(_, v) => v && setF(p => ({ ...p, statusGroup: v }))}>
        {["All", "Open", "Converted", "Written Off"].map(item => <ToggleButton key={item} value={item}>{item}</ToggleButton>)}
      </ToggleButtonGroup>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-end" }}>
        <SearchInput value={String(f.searchText ?? "")} onChange={v => setF(p => ({ ...p, searchText: v }))} placeholder="Search my leads..." />
        <TextField size="small" label="Practice Area" value={String(f.practiceArea ?? "")} onChange={e => setF(p => ({ ...p, practiceArea: e.target.value }))} />
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
        <Button size="small" onClick={() => { setF({ type: "All", statusGroup: "Open" }); onReset() }}>Clear</Button>
      </Box>
    </Box>
  )
}

export default function MyLeadsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState(0)

  return (
    <PageShell
      title="My Leads"
      description={`Leads assigned to ${user?.firstName ?? "you"}`}
    >
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Assigned To Me" />
        <Tab label="Procured By Me" />
      </Tabs>

      {tab === 0 && (
        <DataGrid
          columns={[
            { field: "name", header: "Name", renderCell: v => String(v || "—") },
            { field: "email", header: "Contact", renderCell: (_, row) => {
              const r = row as { email?: string; phone?: string }
              return [r.email, r.phone].filter(Boolean).join(" · ") || "—"
            }},
            { field: "status", header: "Lead Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
            { field: "practiceArea", header: "Practice Area", renderCell: v => String(v || "—") },
            { field: "leadSource", header: "Lead Source", renderCell: v => String(v || "—") },
            { field: "dispute", header: "Dispute", renderCell: v => String(v || "—") },
            { field: "createdAt", header: "Created", renderCell: v => v ? formatDate(String(v)) : "—" },
            { field: "leadType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
          ]}
          queryKey={["leads", "my"]}
          queryFn={(p: GridParams) => leadsApi.getMy({ ...p, filters: { type: "All", statusGroup: "Open", ...p.filters } })}
          FilterPanel={MyLeadFilters}
          hasFilters
          syncWithUrl
          isSortingBackend={false}
          detailPath={row => `/my-leads/${String((row as { id?: string }).id ?? "")}`}
          rowMenuItems={row => [
            { label: "Details", onClick: () => navigate(`/my-leads/${String((row as { id?: string }).id ?? "")}`) },
          ]}
        />
      )}

      {tab === 1 && (
        <DataGrid
          columns={[
            { field: "name", header: "Lead / Client", renderCell: v => String(v || "—") },
            { field: "matterNo", header: "Matter No", renderCell: v => String(v || "—") },
            { field: "billedAmount", header: "Billed", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
            { field: "creditAmount", header: "Credit", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
            { field: "netAmount", header: "Net", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
            { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          ]}
          queryKey={["leads", "procured-by-me"]}
          queryFn={(p: GridParams) => leadsApi.getProcuredByMe(p)}
          hasFilters={false}
        />
      )}
    </PageShell>
  )
}
