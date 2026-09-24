import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Button, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { HearingFormDrawer } from "../matters/_components/HearingFormDrawer"
import { ContinueHearingDrawer } from "../matters/_components/ContinueHearingDrawer"
import { CloseHearingDrawer } from "../matters/_components/CloseHearingDrawer"
import { hearingsApi } from "@/api/hearings"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showMatter: true, showDateRange: true, showClient: true })

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const u = v as { firstName?: string; lastName?: string; fullName?: string; name?: string } | null
  if (!u) return "—"
  return u.fullName || u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"
}

function locName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const loc = v as { name?: string; locationName?: string } | null
  return loc?.name ?? loc?.locationName ?? "—"
}

function matterIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as { matterId?: string; id?: string } | null
  return String(row.matterId ?? mini?.matterId ?? mini?.id ?? (row.matter as { id?: string })?.id ?? "")
}

function hearingIdOf(row: Record<string, unknown>): string {
  return String(row.hearingId ?? row.id ?? "")
}

function isClosed(row: Record<string, unknown>): boolean {
  return String(row.status ?? "").toUpperCase().includes("CLOSE")
}

/** LMS `/hearing/selection` — continueable hearings with Continue / Close / Edit. */
export default function HearingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [continueRow, setContinueRow] = useState<Record<string, unknown> | null>(null)
  const [closeId, setCloseId] = useState<{ hearingId: string; matterId: string } | null>(null)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)

  function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["hearings"] })
  }

  return (
    <PageShell
      title="Hearings"
      description="Open and continued hearings — continue, close, or schedule from here"
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          Same queue as LMS hearing selection (`/hearing/get/continue`)
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setScheduleOpen(true)}>
          Schedule Hearing
        </Button>
      </Box>

      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "hearingDate",
            header: "Hearing Date",
            renderCell: (v, row) => {
              const d = v ?? (row as Record<string, unknown>).nextHearingDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "hearingTime",
            header: "Time",
            renderCell: v => String(v || "—"),
          },
          {
            field: "nextHearingDate",
            header: "Next Hearing",
            renderCell: v => (v && String(v) !== "Invalid date" ? formatDate(String(v)) : "—"),
          },
          {
            field: "summary",
            header: "Decision Summary",
            renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).prvSummary ?? "—"),
          },
          {
            field: "caseNo",
            header: "Case No",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const year = r.caseYear ? ` / ${r.caseYear}` : ""
              return `${String(v || "—")}${year}`
            },
          },
          {
            field: "client",
            header: "Client",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const c = r.clientMini ?? r.client
              if (typeof c === "string") return c || "—"
              const o = c as { companyName?: string; name?: string } | null
              return o?.companyName ?? o?.name ?? "—"
            },
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
            field: "attorneyName",
            header: "Attorney",
            renderCell: (v, row) => String(v || personName((row as Record<string, unknown>).attorney) || "—"),
          },
          {
            field: "hearingLocation",
            header: "Location",
            renderCell: (v, row) => locName(v ?? (row as Record<string, unknown>).location),
          },
          {
            field: "status",
            header: "Status",
            renderCell: v => <StatusBadge status={String(v ?? "")} />,
          },
        ]}
        queryKey={["hearings", "list"]}
        queryFn={(p: GridParams) => hearingsApi.getList(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        emptyState={
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No hearings to continue</Typography>
            <Typography variant="caption" color="text.secondary">Adjust filters or schedule a new hearing.</Typography>
          </Box>
        }
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const mid = matterIdOf(r)
          const hid = hearingIdOf(r)
          const closed = isClosed(r)
          const current = r.current !== false
          return [
            {
              label: "Continue",
              icon: <PlayArrowIcon fontSize="small" />,
              hidden: () => closed || !current || !mid,
              onClick: () => setContinueRow({ ...r, id: hid }),
            },
            {
              label: "Close",
              icon: <CloseIcon fontSize="small" />,
              hidden: () => closed || !hid || !mid,
              onClick: () => setCloseId({ hearingId: hid, matterId: mid }),
            },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              hidden: () => closed || !hid || !mid,
              onClick: () => setEditRow({ ...r, id: hid, matterId: mid }),
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

      <HearingFormDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={() => { toast.success("Hearing scheduled"); refresh() }}
      />
      <HearingFormDrawer
        open={!!editRow}
        matterId={editRow ? matterIdOf(editRow) : undefined}
        hearingId={editRow ? hearingIdOf(editRow) : undefined}
        initial={editRow ? {
          caseNo: String(editRow.caseNo ?? ""),
          hearingDate: String(editRow.hearingDate ?? editRow.nextHearingDate ?? "").slice(0, 10),
          hearingTime: String(editRow.hearingTime ?? ""),
          location: locName(editRow.hearingLocation ?? editRow.location),
          hearingType: String(
            (editRow.hearingsType as { name?: string } | undefined)?.name
            ?? editRow.hearingType
            ?? "",
          ),
          notes: String(editRow.note ?? editRow.notes ?? ""),
        } : undefined}
        onClose={() => setEditRow(null)}
        onSuccess={() => { toast.success("Hearing updated"); refresh() }}
      />
      <ContinueHearingDrawer
        open={!!continueRow}
        hearing={continueRow}
        matterId={continueRow ? matterIdOf(continueRow) : ""}
        onClose={() => setContinueRow(null)}
        onSuccess={() => { toast.success("Hearing continued"); refresh() }}
      />
      <CloseHearingDrawer
        open={!!closeId}
        hearingId={closeId?.hearingId ?? ""}
        matterId={closeId?.matterId ?? ""}
        onClose={() => setCloseId(null)}
        onSuccess={() => { toast.success("Hearing closed"); refresh() }}
      />
    </PageShell>
  )
}
