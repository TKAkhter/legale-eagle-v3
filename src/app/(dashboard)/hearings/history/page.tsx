import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { OpenHearingDrawer } from "../_components/OpenHearingDrawer"
import { hearingsApi } from "@/api/hearings"
import { formatDateTime, formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showMatter: true, showClient: true })

function matterIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as { matterId?: string; id?: string } | null
  return String(row.matterId ?? mini?.matterId ?? mini?.id ?? (row.matter as { id?: string })?.id ?? "")
}

function hearingIdOf(row: Record<string, unknown>): string {
  return String(row.hearingId ?? row.id ?? "")
}

function locName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const loc = v as { name?: string; locationName?: string } | null
  return loc?.name ?? loc?.locationName ?? "—"
}

/** LMS `/hearing/history` — closed/historical hearings with reopen. */
export default function HearingHistoryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [reopen, setReopen] = useState<{ hearingId: string; matterId: string } | null>(null)

  return (
    <PageShell title="Hearing History" description="Closed and historical hearings — reopen when needed">
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "hearingTitle",
            header: "Hearing",
            renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? (row as { hearingsType?: { name?: string } }).hearingsType?.name ?? "—"),
          },
          {
            field: "matterTitle",
            header: "Matter",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const m = r.matterMini as { title?: string } | null
              return String(r.matterTitle ?? m?.title ?? "—")
            },
          },
          {
            field: "hearingDate",
            header: "Date",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "closingDate",
            header: "Closed",
            renderCell: (v, row) => {
              const d = v ?? (row as Record<string, unknown>).closedAt
              return d ? formatDateTime(String(d)) : "—"
            },
          },
          {
            field: "location",
            header: "Location",
            renderCell: (v, row) => locName(v ?? (row as Record<string, unknown>).hearingLocation),
          },
          {
            field: "status",
            header: "Status",
            renderCell: v => <StatusBadge status={String(v ?? "Closed")} />,
          },
          {
            field: "decision",
            header: "Decision",
            renderCell: v => String(v || "—"),
          },
        ]}
        queryKey={["hearings", "history"]}
        queryFn={(p: GridParams) => hearingsApi.getHistory(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        detailPath={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = matterIdOf(r)
          if (!hid) return "/hearings/history"
          return mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`
        }}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const mid = matterIdOf(r)
          const hid = hearingIdOf(r)
          return [
            {
              label: "Details",
              icon: <InfoOutlinedIcon fontSize="small" />,
              hidden: () => !hid,
              onClick: () => navigate(mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`),
            },
            {
              label: "Reopen",
              icon: <RestartAltIcon fontSize="small" />,
              hidden: () => !hid,
              onClick: () => setReopen({ hearingId: hid, matterId: mid }),
            },
            {
              label: "Open Matter",
              icon: <OpenInNewIcon fontSize="small" />,
              hidden: () => !mid,
              onClick: () => navigate(`/matters/${mid}`),
            },
          ]
        }}
      />

      <OpenHearingDrawer
        open={!!reopen}
        hearingId={reopen?.hearingId ?? ""}
        matterId={reopen?.matterId}
        onClose={() => setReopen(null)}
        onSuccess={() => {
          toast.success("Hearing reopened")
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["hearings"] })
        }}
      />
    </PageShell>
  )
}
