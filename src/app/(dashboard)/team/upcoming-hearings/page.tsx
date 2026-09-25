import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { HearingFormDrawer } from "../../matters/_components/HearingFormDrawer"
import { ContinueHearingDrawer } from "../../matters/_components/ContinueHearingDrawer"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const STATIC = [
  {
    hearingId: "h1",
    matterId: "m1",
    hearingTitle: "Case Management Conference",
    hearingDate: "2026-09-25",
    hearingTime: "10:00",
    nextHearingDate: "2026-10-10",
    caseType: "Civil",
    caseNo: "123/2026",
    caseYear: "2026",
    chamberNo: "3",
    attorneyName: "Sara Al Mansoori",
    attendedAttorneyName: "Sara Al Mansoori",
    attorneyId: "u1",
    attendedAttorneyId: "u1",
    hearingLocation: { id: "loc1", name: "Dubai Courts" },
    hearingsType: { id: "ht1", name: "CMC" },
    matterMini: { title: "260303 — Building Dispute", matterId: "m1" },
    clientMini: { client: { clientType: "PERSON", firstName: "Ahmed Hassan" } },
    prvSummary: "Directions given",
    summary: "",
    description: "Prepare witness list",
    note: "",
    current: true,
    status: "OPEN",
  },
  {
    hearingId: "h2",
    matterId: "m2",
    hearingTitle: "Witness Examination",
    hearingDate: "2026-09-28",
    hearingTime: "14:00",
    nextHearingDate: "",
    caseType: "Commercial",
    caseNo: "88/2025",
    caseYear: "2025",
    chamberNo: "1",
    attorneyName: "Omar Khalid",
    attendedAttorneyName: "Omar Khalid",
    attorneyId: "u2",
    attendedAttorneyId: "u2",
    hearingLocation: { id: "loc2", name: "Abu Dhabi Judicial Dept" },
    hearingsType: { id: "ht2", name: "Trial" },
    matterMini: { title: "260293 — Rental Dispute", matterId: "m2" },
    clientMini: { client: { clientType: "COMPANY", companyName: "Al Noor LLC" } },
    prvSummary: "",
    summary: "",
    description: "",
    note: "Bring original lease",
    current: true,
    status: "OPEN",
  },
]

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

function clientName(row: Record<string, unknown>): string {
  const mini = row.clientMini as {
    client?: { clientType?: string; firstName?: string; lastName?: string; companyName?: string; name?: string }
  } | null
  const c = mini?.client ?? (row.client as Record<string, string> | null)
  if (!c) return "—"
  if (typeof c === "string") return c || "—"
  if (c.clientType === "COMPANY" || c.companyName) return String(c.companyName || c.name || "—")
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || String(c.name || "—")
}

function matterTitle(row: Record<string, unknown>): string {
  const mini = row.matterMini as { title?: string } | null
  return String(row.matterTitle ?? mini?.title ?? (row.matter as { title?: string })?.title ?? "—")
}

function locName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const loc = v as { name?: string; locationName?: string } | null
  return loc?.name ?? loc?.locationName ?? "—"
}

function safeDate(v: unknown): string {
  if (!v || String(v) === "Invalid date") return "—"
  return formatDate(String(v))
}

/** Normalize attorney-hearing rows so ContinueHearingDrawer can prefill. */
function toContinueHearing(row: Record<string, unknown>): Record<string, unknown> {
  const ht = row.hearingsType as { id?: string; name?: string } | null
  const loc = row.hearingLocation as { id?: string; name?: string } | string | null
  return {
    ...row,
    id: hearingIdOf(row),
    hearingId: hearingIdOf(row),
    matterId: matterIdOf(row),
    caseTypeId: String(row.caseTypeId ?? row.caseType ?? ""),
    typeId: String(ht?.id ?? row.typeId ?? ""),
    hearingLocation: typeof loc === "object" && loc ? loc : { id: String(loc ?? ""), name: String(loc ?? "") },
    nextHearingDate: row.nextHearingDate && String(row.nextHearingDate) !== "Invalid date"
      ? row.nextHearingDate
      : row.hearingDate,
  }
}

async function fetchUpcoming(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    return { content: STATIC, totalElements: STATIC.length, totalPages: 1, number: 0, size: STATIC.length, first: true, last: true, empty: false }
  }
  const r = await axiosClient.get("/api/hearing/for/attorney")
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: false }
}

/** LMS `/all/upcoming/hearings` — attorney hearings with Continue + full columns. */
export default function UpcomingHearingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [continueRow, setContinueRow] = useState<Record<string, unknown> | null>(null)
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  function refresh() {
    qc.invalidateQueries({ queryKey: ["hearings", "upcoming"] })
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title={t("nav.upcomingHearings")}
      description={t("pages.upcomingHearingsDesc")}
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Hearing
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "hearingDate",
            header: "Hearing Date",
            minWidth: 120,
            renderCell: (v, row) => safeDate(v ?? (row as Record<string, unknown>).date),
          },
          {
            field: "hearingTime",
            header: "Hearing Time",
            minWidth: 100,
            renderCell: v => String(v || "—"),
          },
          {
            field: "nextHearingDate",
            header: "Next Hearing Date",
            minWidth: 130,
            renderCell: v => safeDate(v),
          },
          {
            field: "prvSummary",
            header: "Previous Decision Summary",
            minWidth: 180,
            renderCell: v => String(v || "—"),
          },
          {
            field: "summary",
            header: "Decision Summary",
            minWidth: 160,
            renderCell: v => String(v || "—"),
          },
          {
            field: "description",
            header: "Hearing Instruction",
            minWidth: 160,
            renderCell: v => String(v || "—"),
          },
          {
            field: "caseType",
            header: "Case Type",
            minWidth: 110,
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const ct = r.caseType as { name?: string } | string | null
              if (typeof ct === "object" && ct) return String(ct.name || "—")
              return String(v || "—")
            },
          },
          { field: "caseNo", header: "Case No", minWidth: 100, renderCell: v => String(v || "—") },
          { field: "caseYear", header: "Case Year", minWidth: 90, renderCell: v => String(v || "—") },
          { field: "chamberNo", header: "Chamber No", minWidth: 100, renderCell: v => String(v || "—") },
          {
            field: "client",
            header: "Client",
            minWidth: 140,
            renderCell: (_v, row) => clientName(row as Record<string, unknown>),
          },
          {
            field: "matter",
            header: "Matter",
            minWidth: 180,
            renderCell: (_v, row) => matterTitle(row as Record<string, unknown>),
          },
          {
            field: "attorneyName",
            header: "Attorney",
            minWidth: 140,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).attorney || "—"),
          },
          {
            field: "attendedAttorneyName",
            header: "Attended Attorney",
            minWidth: 150,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).attendedAttorney || "—"),
          },
          {
            field: "hearingLocation",
            header: "Hearing Location",
            minWidth: 140,
            renderCell: (v, row) => locName(v ?? (row as Record<string, unknown>).location),
          },
          {
            field: "note",
            header: "Hearing Note",
            minWidth: 140,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).notes || "—"),
          },
          {
            field: "status",
            header: "Status",
            minWidth: 110,
            renderCell: v => <StatusBadge status={String(v || "Scheduled")} />,
          },
        ]}
        queryKey={["hearings", "upcoming"]}
        queryFn={fetchUpcoming}
        isPaginated={false}
        zebraStriping
        detailPath={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = matterIdOf(r)
          if (!hid) return "/hearings"
          return mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`
        }}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = matterIdOf(r)
          const closed = isClosed(r)
          const current = r.current !== false
          const items = [
            {
              label: "Details",
              icon: <InfoOutlinedIcon fontSize="small" />,
              onClick: () => navigate(mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`),
            },
          ]
          if (!closed && current && mid && hid) {
            items.push({
              label: "Continue",
              icon: <PlayArrowIcon fontSize="small" />,
              onClick: () => setContinueRow(toContinueHearing(r)),
            })
          }
          if (mid) {
            items.push({
              label: "Open Matter",
              icon: <OpenInNewIcon fontSize="small" />,
              onClick: () => navigate(`/matters/${mid}`),
            })
          }
          return items
        }}
      />
      <HearingFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success("Hearing scheduled")
          refresh()
        }}
      />
      <ContinueHearingDrawer
        open={!!continueRow}
        hearing={continueRow}
        matterId={continueRow ? matterIdOf(continueRow) : ""}
        onClose={() => setContinueRow(null)}
        onSuccess={() => {
          toast.success("Hearing continued")
          refresh()
        }}
      />
    </PageShell>
  )
}
