/**
 * Activities list — old LMS /activities parity (firm-wide activity feed).
 */
import { useState } from "react"
import { Box, TextField } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FilterActions, SearchInput, DateRangeFilter } from "@components/filters"
import { axiosClient } from "@lib/api/axios"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

function ActivityFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>({ ...filters })
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <SearchInput
        value={String(f.searchText ?? "")}
        onChange={v => setF(p => ({ ...p, searchText: v }))}
        placeholder="Search activities..."
      />
      <TextField
        size="small"
        label="Added By"
        value={String(f.actor ?? "")}
        onChange={e => setF(p => ({ ...p, actor: e.target.value }))}
      />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => { setF({}); onReset() }}
      />
    </Box>
  )
}

async function fetchActivities(p: GridParams) {
  const f = p.filters ?? {}
  const res = await axiosClient.get("/api/activity/get/all", {
    params: {
      pageNumber: p.page,
      pageSize: p.pageSize,
      searchText: f.searchText ?? "",
      actor: f.actor ?? "",
      fromDate: f.fromDate ?? "",
      toDate: f.toDate ?? "",
    },
  })
  const rows = unwrapAxiosList(res.data)
  const d = res.data?.data ?? res.data ?? {}
  return {
    content: rows,
    totalElements: Number(d.totalElements ?? rows.length),
    totalPages: Number(d.totalPages ?? 1),
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: true,
    empty: rows.length === 0,
  }
}

export default function ActivitiesPage() {
  return (
    <PageShell title="Activities" description="Firm-wide activity log">
      <DataGrid
        columns={[
          { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
          { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
          { field: "addedByName", header: "Added By", renderCell: v => String(v || "—") },
          { field: "billingType", header: "Billing", renderCell: v => String(v || "—") },
          { field: "createdAt", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
        ]}
        queryKey={["activities", "list"]}
        queryFn={(p) => fetchActivities(p as GridParams)}
        FilterPanel={ActivityFilters}
        hasFilters
        defaultPageSize={20}
        detailPath={(row) => {
          const r = row as Record<string, unknown>
          return r.activityId ? `/time-log-entries/${String(r.activityId)}` : "/time-log-entries"
        }}
      />
    </PageShell>
  )
}
