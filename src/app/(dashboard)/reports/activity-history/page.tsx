import { useState } from "react"
import { Box, Button, Chip, Typography, Paper } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { UserSelectFilter } from "@components/filters/UserSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { reportsApi } from "@/api/reports"
import { formatDateTime, fromNow } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

const ENTITY_COLOURS: Record<string, "primary" | "success" | "warning" | "info" | "secondary" | "default"> = {
  Matter: "primary",
  Invoice: "success",
  Lead: "info",
  Client: "secondary",
  Task: "warning",
  Timelog: "default",
}

function Filters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
      <ClientSelectFilter value={String(f.clientId ?? "") || undefined} onChange={v => set("clientId", v)} />
      <MatterSelectFilter value={String(f.matterId ?? "") || undefined} onChange={v => set("matterId", v)} />
      <UserSelectFilter value={String(f.userId ?? "")} onChange={v => set("userId", v)} label="Responsible" />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
    </Box>
  )
}

export default function ActivityHistoryPage() {
  async function emailExcel() {
    try {
      toast.success(await reportsApi.requestActivityHistoryExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <PageShell
      title="Activity History"
      description="Firm-wide activity history for the selected period"
      action={(
        <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={[
          {
            field: "createdAt",
            header: "When",
            sortKey: "createdAt",
            renderCell: v => (
              <Box>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 500, fontSize: 12 }}>{formatDateTime(String(v ?? ""))}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>{fromNow(String(v ?? ""))}</Typography>
              </Box>
            ),
          },
          {
            field: "actor",
            header: "User",
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).responsiblePersonName || (row as Record<string, unknown>).performedBy || "—"),
          },
          {
            field: "entity",
            header: "Module",
            renderCell: (v, row) => {
              const label = String(v || (row as Record<string, unknown>).category || "—")
              return <Chip size="small" label={label} color={ENTITY_COLOURS[label] ?? "default"} variant="outlined" sx={{ fontSize: 11 }} />
            },
          },
          {
            field: "entityName",
            header: "Record",
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).matterTitle || (row as Record<string, unknown>).activity || "—"),
          },
          { field: "description", header: "Description", renderCell: (v, row) => String(v || (row as Record<string, unknown>).note || "—") },
        ]}
        queryKey={["reports", "activity-history"]}
        queryFn={(p: GridParams) => reportsApi.getActivityHistory(p)}
        FilterPanel={Filters}
        hasFilters
        syncWithUrl
        defaultSortBy="createdAt"
        defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
