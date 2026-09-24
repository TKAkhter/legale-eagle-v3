import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ActivityFormDrawer } from "../time-log-entries/_components/ActivityFormDrawer"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import type { GridParams, PageResponse } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true })

async function fetchMatters(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
  if (env.USE_STATIC_DATA) {
    const rows = [
      { id: "m1", title: "260303 — Building Dispute", clientName: "Al Rashid Holdings", status: "OPEN", billingType: "Hourly" },
      { id: "m2", title: "260293 — Employment", clientName: "KM Group", status: "OPEN", billingType: "Fixed" },
    ]
    return { content: rows, totalElements: rows.length, totalPages: 1, number: 0, size: p.pageSize, first: true, last: true, empty: false }
  }
  const f = p.filters ?? {}
  const res = await axiosClient.get("/api/matter/mini", {
    params: {
      clientId: f.clientId ?? "",
      searchText: f.searchText ?? f.q ?? "",
      pageNumber: p.page,
      pageSize: p.pageSize,
    },
  })
  const d = res.data?.data ?? res.data ?? {}
  const content = (Array.isArray(d) ? d : d.content ?? []) as Record<string, unknown>[]
  return {
    content: content.map(r => ({ ...r, id: String(r.id ?? r.matterId) })),
    totalElements: Number(d.totalElements ?? content.length),
    totalPages: Number(d.totalPages ?? 1),
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: true,
    empty: content.length === 0,
  }
}

/** Quick matter picker → open time-entry drawer (LMS /matter-selection). */
export default function MatterSelectionPage() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [matterId, setMatterId] = useState<string | undefined>(params.get("matterId") ?? undefined)
  const [drawerOpen, setDrawerOpen] = useState(!!params.get("matterId"))

  return (
    <PageShell title="Matter Selection" description="Pick a matter to log time quickly">
      <DataGrid
        columns={[
          { field: "title", header: "Matter", sortKey: "title", renderCell: v => String(v || "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => String(v ?? (row as { client?: { companyName?: string } }).client?.companyName ?? "—") },
          { field: "billingType", header: "Billing", renderCell: v => String(v || "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["matters", "selection"]}
        queryFn={fetchMatters}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        rowMenuItems={row => [
          {
            label: "Log Time",
            onClick: () => {
              setMatterId(String((row as { id?: string }).id ?? ""))
              setDrawerOpen(true)
            },
          },
          {
            label: "Open Matter",
            onClick: () => { window.location.href = `/matters/${String((row as { id?: string }).id ?? "")}` },
          },
        ]}
      />
      <ActivityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        prefillMatterId={matterId}
        onSuccess={() => {
          setDrawerOpen(false)
          qc.invalidateQueries({ queryKey: ["time-log-entries"] })
          toast.success("Time entry saved")
        }}
      />
    </PageShell>
  )
}
