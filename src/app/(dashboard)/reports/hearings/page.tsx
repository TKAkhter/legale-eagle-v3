import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Autocomplete,
  Box,
  Button,
  TextField,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ClientSelectFilter } from "@/components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@/components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@/components/filters/DateRangeFilter"
import { FilterActions } from "@/components/filters/FilterActions"
import { ContinueHearingDrawer } from "@/app/(dashboard)/matters/_components/ContinueHearingDrawer"
import { CloseHearingDrawer } from "@/app/(dashboard)/matters/_components/CloseHearingDrawer"
import { HearingFormDrawer } from "@/app/(dashboard)/matters/_components/HearingFormDrawer"
import { OpenHearingDrawer } from "@/app/(dashboard)/hearings/_components/OpenHearingDrawer"
import { reportsApi } from "@/api/reports"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

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

interface UserOpt { id: string; label: string }
interface NamedOpt { id: string; name: string }

function HearingsReportFilterPanel({
  onSearch, onReset, filters,
}: {
  onSearch: (f: Record<string, unknown>) => void
  onReset: () => void
  filters: Record<string, unknown>
}) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  const usersQ = useQuery({
    queryKey: ["users", "min", "hearings-report"],
    queryFn: () => adminApi.getUsersMin(),
    staleTime: 60_000,
  })
  const typesQ = useQuery({
    queryKey: ["hearing-types"],
    queryFn: async () => {
      const r = await axiosClient.get("/api/hearing/list/type")
      return (r.data?.data ?? r.data ?? []) as NamedOpt[]
    },
    staleTime: 60_000,
  })
  const locsQ = useQuery({
    queryKey: ["hearing-locations"],
    queryFn: async () => {
      const r = await axiosClient.get("/api/hearing/list/location")
      return (r.data?.data ?? r.data ?? []) as NamedOpt[]
    },
    staleTime: 60_000,
  })
  const caseTypesQ = useQuery({
    queryKey: ["matter-case-types"],
    queryFn: async () => {
      const r = await axiosClient.get("/api/matter/case/types")
      return (r.data?.data ?? r.data ?? []) as (NamedOpt | string)[]
    },
    staleTime: 60_000,
  })

  const userOpts: UserOpt[] = useMemo(
    () => ((usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string }[])
      .map(u => ({
        id: String(u.id ?? ""),
        label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id),
      }))
      .filter(u => u.id),
    [usersQ.data],
  )

  const typeOpts = useMemo(
    () => (typesQ.data ?? []).map(t => ({
      id: String((t as NamedOpt).id ?? ""),
      name: String((t as NamedOpt).name ?? (t as NamedOpt).id ?? ""),
    })).filter(t => t.id),
    [typesQ.data],
  )

  const locOpts = useMemo(
    () => (locsQ.data ?? []).map(t => ({
      id: String((t as NamedOpt).id ?? ""),
      name: String((t as NamedOpt).name ?? (t as NamedOpt).id ?? ""),
    })).filter(t => t.id),
    [locsQ.data],
  )

  const caseTypeOpts = useMemo(
    () => (caseTypesQ.data ?? []).map(t => {
      if (typeof t === "string") return t
      return String((t as NamedOpt).name ?? (t as NamedOpt).id ?? "")
    }).filter(Boolean),
    [caseTypesQ.data],
  )

  const selectedAttorneys = userOpts.filter(u => (f.attorneyIds as string[] | undefined)?.includes(u.id))
  const selectedAttended = userOpts.filter(u => (f.attendedAttorneyIds as string[] | undefined)?.includes(u.id))

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter value={String(f.clientId ?? "")} onChange={v => set("clientId", v)} />
      <MatterSelectFilter value={String(f.matterId ?? "")} onChange={v => set("matterId", v)} />
      <Autocomplete
        size="small"
        sx={{ minWidth: 160 }}
        options={typeOpts}
        getOptionLabel={o => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={typeOpts.find(t => t.id === String(f.hearingType ?? "")) ?? null}
        onChange={(_, v) => set("hearingType", v?.id ?? "")}
        renderInput={params => <TextField {...params} label="Hearing Type" />}
      />
      <Autocomplete
        size="small"
        sx={{ minWidth: 160 }}
        options={locOpts}
        getOptionLabel={o => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={locOpts.find(t => t.id === String(f.hearingLocation ?? "")) ?? null}
        onChange={(_, v) => set("hearingLocation", v?.id ?? "")}
        renderInput={params => <TextField {...params} label="Location" />}
      />
      <Autocomplete
        multiple
        size="small"
        sx={{ minWidth: 200 }}
        options={userOpts}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={selectedAttorneys}
        onChange={(_, v) => set("attorneyIds", v.map(x => x.id))}
        renderInput={params => <TextField {...params} label="Attorneys" />}
      />
      <Autocomplete
        multiple
        size="small"
        sx={{ minWidth: 200 }}
        options={userOpts}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={selectedAttended}
        onChange={(_, v) => set("attendedAttorneyIds", v.map(x => x.id))}
        renderInput={params => <TextField {...params} label="Attended Attorneys" />}
      />
      <Autocomplete
        size="small"
        sx={{ minWidth: 140 }}
        options={caseTypeOpts}
        value={String(f.caseType ?? "") || null}
        onChange={(_, v) => set("caseType", v ?? "")}
        renderInput={params => <TextField {...params} label="Case Type" />}
      />
      <TextField
        size="small"
        label="Case No"
        sx={{ width: 120 }}
        value={String(f.caseNo ?? "")}
        onChange={e => set("caseNo", e.target.value)}
      />
      <TextField
        size="small"
        label="Case Year"
        sx={{ width: 110 }}
        value={String(f.caseYear ?? "")}
        onChange={e => set("caseYear", e.target.value)}
      />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ fontSize: 11, color: "text.secondary", pl: 0.5 }}>Hearing date</Box>
        <DateRangeFilter
          fromDate={String(f.fromDate ?? "")}
          toDate={String(f.toDate ?? "")}
          onChange={v => setF(p => ({ ...p, ...v }))}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ fontSize: 11, color: "text.secondary", pl: 0.5 }}>Next hearing date</Box>
        <DateRangeFilter
          fromDate={String(f.nextHearingFromDate ?? "")}
          toDate={String(f.nextHearingToDate ?? "")}
          onChange={v => setF(p => ({
            ...p,
            nextHearingFromDate: v.fromDate,
            nextHearingToDate: v.toDate,
          }))}
        />
      </Box>
      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => { setF({}); onReset() }}
        searchLabel="Search"
      />
    </Box>
  )
}

/** LMS `/reports/hearings` — full filters, columns, Continue/Close/Open/Edit + Email Excel. */
export default function HearingsReportPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)
  const [continueRow, setContinueRow] = useState<Record<string, unknown> | null>(null)
  const [closeId, setCloseId] = useState<{ hearingId: string; matterId: string } | null>(null)
  const [openId, setOpenId] = useState<{ hearingId: string; matterId: string } | null>(null)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)

  function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["reports", "hearings"] })
  }

  async function handleEmailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestHearingsReportExcel(appliedFilters))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  const FilterPanel = useMemo(() => {
    return function Panel(props: {
      onSearch: (f: Record<string, unknown>) => void
      onReset: () => void
      filters: Record<string, unknown>
    }) {
      return (
        <HearingsReportFilterPanel
          {...props}
          onSearch={f => {
            setAppliedFilters(f)
            props.onSearch(f)
          }}
          onReset={() => {
            setAppliedFilters({})
            props.onReset()
          }}
        />
      )
    }
  }, [])

  return (
    <PageShell
      title="Hearings Report"
      description="Upcoming and past hearings by matter"
      action={(
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleEmailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "matter",
            header: "Matter",
            minWidth: 180,
            renderCell: (_v, row) => matterTitle(row as Record<string, unknown>),
          },
          {
            field: "description",
            header: "Hearing Instruction",
            minWidth: 160,
            renderCell: v => String(v || "—"),
          },
          {
            field: "note",
            header: "Hearing Note",
            minWidth: 140,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).notes || "—"),
          },
          {
            field: "prvSummary",
            header: "Previous Decision Summary",
            minWidth: 160,
            renderCell: v => String(v || "—"),
          },
          {
            field: "summary",
            header: "Decision Summary",
            minWidth: 140,
            renderCell: v => String(v || "—"),
          },
          {
            field: "attorneyName",
            header: "Responsible Attorney",
            minWidth: 140,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).attorney || "—"),
          },
          {
            field: "attendedAttorneyName",
            header: "Attended Attorney",
            minWidth: 140,
            renderCell: (v, row) => String(v || (row as Record<string, unknown>).attendedAttorney || "—"),
          },
          {
            field: "caseType",
            header: "Case Type",
            minWidth: 110,
            renderCell: (v, row) => {
              const ct = (row as Record<string, unknown>).caseType
              if (typeof ct === "object" && ct) return String((ct as { name?: string }).name || "—")
              return String(v || "—")
            },
          },
          { field: "caseNo", header: "Case No", minWidth: 100, renderCell: v => String(v || "—") },
          { field: "caseYear", header: "Case Year", minWidth: 90, renderCell: v => String(v || "—") },
          {
            field: "client",
            header: "Client",
            minWidth: 140,
            renderCell: (_v, row) => clientName(row as Record<string, unknown>),
          },
          { field: "chamberNo", header: "Chamber No", minWidth: 100, renderCell: v => String(v || "—") },
          {
            field: "hearingLocation",
            header: "Hearing Location",
            minWidth: 140,
            renderCell: (v, row) => locName(v ?? (row as Record<string, unknown>).location),
          },
          {
            field: "hearingDate",
            header: "Hearing Date",
            minWidth: 120,
            renderCell: v => safeDate(v),
          },
          {
            field: "hearingTime",
            header: "Hearing Time",
            minWidth: 100,
            renderCell: v => String(v || "—"),
          },
          {
            field: "hearingType",
            header: "Hearing Type",
            minWidth: 120,
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const ht = r.hearingsType as { name?: string } | null
              return String(ht?.name ?? r.hearingType ?? "—")
            },
          },
          {
            field: "nextHearingDate",
            header: "Next Hearing Date",
            minWidth: 130,
            renderCell: v => safeDate(v),
          },
        ]}
        queryKey={["reports", "hearings"]}
        queryFn={(p: GridParams) => reportsApi.getHearingsReport(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
        detailPath={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = matterIdOf(r)
          if (!hid) return "/reports/hearings"
          return mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`
        }}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = matterIdOf(r)
          const closed = isClosed(r)
          const current = r.current !== false
          return [
            {
              label: "Details",
              icon: <InfoOutlinedIcon fontSize="small" />,
              hidden: () => !hid,
              onClick: () => navigate(mid ? `/hearings/${hid}?matterId=${encodeURIComponent(mid)}` : `/hearings/${hid}`),
            },
            {
              label: "Continue",
              icon: <PlayArrowIcon fontSize="small" />,
              hidden: () => closed || !current || !mid || !hid,
              onClick: () => setContinueRow(toContinueHearing(r)),
            },
            {
              label: "Close",
              icon: <CloseIcon fontSize="small" />,
              hidden: () => closed || !current || !hid || !mid,
              onClick: () => setCloseId({ hearingId: hid, matterId: mid }),
            },
            {
              label: "Reopen",
              icon: <LockOpenIcon fontSize="small" />,
              hidden: () => !closed || !current || !hid || !mid,
              onClick: () => setOpenId({ hearingId: hid, matterId: mid }),
            },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              hidden: () => !hid || !mid,
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
      <OpenHearingDrawer
        open={!!openId}
        hearingId={openId?.hearingId ?? ""}
        matterId={openId?.matterId ?? ""}
        onClose={() => setOpenId(null)}
        onSuccess={() => { toast.success("Hearing reopened"); refresh() }}
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
    </PageShell>
  )
}
