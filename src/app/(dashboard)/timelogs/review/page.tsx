import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, FormControl, InputLabel, MenuItem, Select,
} from "@mui/material"
import DraftsIcon from "@mui/icons-material/Drafts"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function TimelogQueueFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter value={String(f.clientId ?? "") || undefined} onChange={v => set("clientId", v)} />
      <MatterSelectFilter value={String(f.matterId ?? "") || undefined} onChange={v => set("matterId", v)} />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>LFA Billing Type</InputLabel>
        <Select label="LFA Billing Type" value={String(f.lfaBillingType ?? "")} onChange={e => set("lfaBillingType", e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
        </Select>
      </FormControl>
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

function personName(v: unknown): string {
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function clientName(v: unknown): string {
  const c = v as Record<string, string> | null
  return c?.companyName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "—"
}

export default function TimelogsReviewPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title="Timelogs Review"
      description="Non-hourly billable entries ready to mark as draft"
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "client", header: "Client", renderCell: v => clientName(v), minWidth: 140 },
          { field: "activity", header: "Description", renderCell: (v, row) => String(v || (row as Record<string, unknown>).note || "—"), minWidth: 160 },
          { field: "responsiblePerson", header: "Lawyer", renderCell: v => personName(v) },
          { field: "totalHours", header: "Hours", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "unit", header: "Unit", align: "right", renderCell: v => String(v ?? "—") },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "entryDate", header: "Entry Date", renderCell: v => formatDate(String(v ?? "")) },
          { field: "matter", header: "Matter", renderCell: v => (v as Record<string, string>)?.title ?? "—" },
          { field: "agreementNo", header: "Agreement No.", renderCell: v => String(v || "—") },
          { field: "lfaBillingType", header: "LFA Type", renderCell: v => <StatusBadge status={String(v || "—")} /> },
          { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["timelogs", "review"]}
        queryFn={(p: GridParams) => timelogsApi.getBillable(p)}
        FilterPanel={TimelogQueueFilter}
        hasFilters
        syncWithUrl
        hasRowSelection
        defaultSortBy="entryDate"
        defaultSortDir="desc"
        bulkActions={[{
          label: "Generate Draft",
          icon: <DraftsIcon fontSize="small" />,
          onClick: async (rows) => {
            try {
              const ids = rows.map(r => String((r as { id?: string }).id ?? "")).filter(Boolean)
              toast.success(await timelogsApi.markDraft(ids))
              setGridKey(k => k + 1)
              qc.invalidateQueries({ queryKey: ["timelogs"] })
            } catch {
              toast.error("Failed to mark draft")
            }
          },
        }]}
      />
    </PageShell>
  )
}
