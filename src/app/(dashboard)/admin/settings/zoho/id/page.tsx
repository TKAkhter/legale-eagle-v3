import { useState } from "react"
import {
  Box, Button, FormControlLabel, MenuItem, Paper, Switch, TextField, Typography, LinearProgress,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { FilterActions } from "@components/filters"
import { zohoApi } from "@/api/zoho"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

function ZohoClientFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState(filters)
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
      <ClientSelectFilter value={String(f.clientId ?? "")} onChange={v => setF(p => ({ ...p, clientId: v ?? "" }))} />
      <TextField
        select size="small" label="Status" value={String(f.status ?? "")}
        onChange={e => setF(p => ({ ...p, status: e.target.value }))}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="OPEN">Open</MenuItem>
        <MenuItem value="CLOSE">Close</MenuItem>
      </TextField>
      <TextField
        size="small" label="Zoho Client ID" value={String(f.zohoClientId ?? "")}
        onChange={e => setF(p => ({ ...p, zohoClientId: e.target.value }))}
      />
      <FormControlLabel
        control={
          <Switch
            checked={f.zohoExists !== false && f.zohoExists !== "false"}
            onChange={e => setF(p => ({ ...p, zohoExists: e.target.checked }))}
          />
        }
        label="Has Zoho ID"
      />
      <FilterActions onSearch={() => onSearch(f)} onClear={() => { setF({}); onReset() }} />
    </Box>
  )
}

export default function ZohoIdConfigPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [gridKey, setGridKey] = useState(0)

  const saveMut = useMutation({
    mutationFn: (payload: { clientId: string; zohoClientId: string }) =>
      zohoApi.updateZohoIds([payload]),
    onSuccess: (msg) => {
      toast.success(msg)
      setEditingId(null)
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["zoho", "clients"] })
    },
    onError: (e: unknown) => toast.error((e as { message?: string })?.message ?? "Update failed"),
  })

  return (
    <PageShell
      title="Zoho Id Configuration"
      description="Map LMS clients to Zoho Books customer IDs"
      breadcrumbs={[{ label: "Settings", path: "/admin/settings" }, { label: "Zoho Id" }]}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "clientName", header: "Client Name" },
          { field: "clientType", header: "Type" },
          { field: "clientExternalId", header: "External ID", renderCell: v => String(v || "—") },
          {
            field: "zohoClientId",
            header: "Zoho Client ID",
            renderCell: (v, row) => {
              const id = String((row as { clientId?: string; id?: string }).clientId ?? (row as { id?: string }).id ?? "")
              if (editingId === id) {
                return (
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                    <TextField size="small" value={editValue} onChange={e => setEditValue(e.target.value)} sx={{ minWidth: 140 }} />
                    <Button size="small" variant="contained" disabled={saveMut.isPending} onClick={() => saveMut.mutate({ clientId: id, zohoClientId: editValue })}>Save</Button>
                    <Button size="small" onClick={() => setEditingId(null)}>Cancel</Button>
                  </Box>
                )
              }
              return String(v || "—")
            },
          },
          { field: "status", header: "Status" },
          { field: "openMatter", header: "Open", align: "right" },
          { field: "closeMatter", header: "Closed", align: "right" },
          { field: "createdAt", header: "Created", renderCell: v => formatDate(String(v ?? "")) },
        ]}
        queryKey={["zoho", "clients"]}
        queryFn={(p: GridParams) => zohoApi.getClients({
          ...p,
          filters: { zohoExists: true, ...p.filters },
        })}
        FilterPanel={ZohoClientFilters}
        hasFilters
        zebraStriping
        rowMenuItems={(row) => {
          const id = String((row as { clientId?: string; id?: string }).clientId ?? (row as { id?: string }).id ?? "")
          return [
            {
              label: "Edit Zoho ID",
              onClick: () => {
                setEditingId(id)
                setEditValue(String((row as { zohoClientId?: string }).zohoClientId ?? ""))
              },
            },
          ]
        }}
      />
    </PageShell>
  )
}
