/**
 * Activity History Report — filterable activity log for reports.
 *
 * Different from Audit Log (admin tool):
 *   Audit Log     = data changes (who changed what field)
 *   Activity Feed = business events (matters created, invoices paid, etc.)
 *
 * This page is for partners/managers to review firm activity over a period.
 */
import { useState } from "react"
import { Box, Button, Chip, Typography } from "@mui/material"
import { PageShell }   from "@/components/ui/PageShell"
import { DataGrid }    from "@components/data-grid/DataGrid"
import { SearchInput } from "@components/filters/SearchInput"
import { activityApi } from "@/api/activity"
import { formatDateTime, fromNow } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

const ENTITY_COLOURS: Record<string, "primary"|"success"|"warning"|"info"|"secondary"|"default"> = {
  Matter:  "primary",
  Invoice: "success",
  Lead:    "info",
  Client:  "secondary",
  Task:    "warning",
  Timelog: "default",
}

function Filters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [q, setQ] = useState(String(filters.searchText ?? ""))
  return (
    <Box sx={{ display:"flex", gap:1.5, alignItems:"flex-end", flexWrap:"wrap" }}>
      <SearchInput value={q} onChange={setQ} placeholder="Search activity…" />
      <Button variant="contained" size="small" onClick={() => onSearch({ searchText: q })}>Search</Button>
      <Button size="small" onClick={() => { setQ(""); onReset() }}>Reset</Button>
    </Box>
  )
}

export default function ActivityHistoryPage() {
  return (
    <PageShell title="Activity History" description="Firm-wide activity log for the selected period">
      <DataGrid
        columns={[
          { field:"createdAt", header:"When", sortKey:"createdAt",
            renderCell:(v) => (
              <Box>
                <Typography variant="caption" sx={{ display:"block", fontWeight:500, fontSize:12 }}>{formatDateTime(String(v??""))}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize:11 }}>{fromNow(String(v??""))}</Typography>
              </Box>
            )
          },
          { field:"actor",       header:"User",        sortKey:"actor" },
          { field:"entity",      header:"Module",
            renderCell:(v) => <Chip size="small" label={String(v??"")} color={ENTITY_COLOURS[String(v??"")] ?? "default"} variant="outlined" sx={{ fontSize:11 }} />
          },
          { field:"entityName",  header:"Record",      sortKey:"entityName" },
          { field:"description", header:"Description" },
        ]}
        queryKey={["activity","history"]}
        queryFn={(p: GridParams) =>
          activityApi.getAuditLog(p) as unknown as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>
        }
        FilterPanel={Filters}
        hasFilters syncWithUrl
        defaultSortBy="createdAt" defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
