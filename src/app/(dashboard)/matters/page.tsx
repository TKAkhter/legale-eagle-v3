import { useState } from "react"
import { Button, Box, Chip, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import AddIcon   from "@mui/icons-material/Add"
import GavelIcon from "@mui/icons-material/Gavel"
import { DataGrid }    from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SearchInput } from "@/components/filters/SearchInput"
import { mattersApi }  from "@/api/matters"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types"
import type { FilterPanelProps } from "@/components/data-grid/types"

function MatterFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string,unknown>>(filters)
  return (
    <Box sx={{ display:"flex", flexWrap:"wrap", gap:1.5, alignItems:"flex-end" }}>
      <SearchInput value={String(f.searchText??"")} onChange={v => setF(p => ({...p,searchText:v}))} placeholder="Search matters..." />
      <FormControl size="small" sx={{ minWidth:140 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={String(f.status??"")} onChange={e => setF(p => ({...p,status:e.target.value}))}>
          <MenuItem value=""><em>All</em></MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="CLOSED">Closed</MenuItem>
          <MenuItem value="RE_OPEN">Re-Opened</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth:140 }}>
        <InputLabel>Billing Type</InputLabel>
        <Select label="Billing Type" value={String(f.billingType??"")} onChange={e => setF(p => ({...p,billingType:e.target.value}))}>
          <MenuItem value=""><em>All</em></MenuItem>
          {["Hourly","Fixed","Session","Contingent","NoAgreement"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display:"flex", gap:1 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </Box>
    </Box>
  )
}

export default function MattersPage() {
  const canAdd = useAuthStore((s) => s.hasPermission)("/matters")

  return (
    <Box>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:2.5 }}>
        <Box>
          <Box component="h1" sx={{ m:0, fontSize:"1.375rem", fontWeight:700, color:"text.primary" }}>Matters</Box>
          <Box component="p" sx={{ m:0, fontSize:"0.875rem", color:"text.secondary" }}>All active and closed legal matters</Box>
        </Box>
        {canAdd && (
          <Button variant="contained" startIcon={<AddIcon />}>New Matter</Button>
        )}
      </Box>

      <DataGrid
        columns={[
          { field:"title", header:"Matter Title", renderCell:(v,row) => {
            const r = row as Record<string,unknown>
            return (
              <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                <GavelIcon sx={{ fontSize:16, color:"text.disabled" }} />
                <Box>
                  <Box sx={{ fontWeight:500, fontSize:13 }}>{String(v??"")}</Box>
                  <Box sx={{ fontSize:11, color:"text.secondary" }}>{String(r.practiceArea??"")}</Box>
                </Box>
              </Box>
            )
          }},
          { field:"clientMini", header:"Client", renderCell:(v) => {
            const c = v as Record<string,string>
            return c?.companyName || c?.firstName || "—"
          }},
          { field:"lawyers",     header:"Attorney" },
          { field:"billingType", header:"Billing", renderCell:(v) => <Chip size="small" label={String(v??"")} variant="outlined" /> },
          { field:"status",      header:"Status",  renderCell:(v) => <StatusBadge status={String(v??"")} /> },
          { field:"createdAt",   header:"Created", renderCell:(v) => v ? new Date(String(v)).toLocaleDateString("en-GB") : "—" },
        ]}
        queryKey={["matters","list"]}
        queryFn={(p) => mattersApi.getAll(p as GridParams) as unknown as Promise<import("@/types").PageResponse<Record<string,unknown>>>}
        FilterPanel={MatterFilters}
        hasFilters syncWithUrl
        detailPath={(row) => `/matters/${(row as Record<string,string>).matterId}`}
        defaultSortBy="createdAt" defaultSortDir="desc"
      />
    </Box>
  )
}
