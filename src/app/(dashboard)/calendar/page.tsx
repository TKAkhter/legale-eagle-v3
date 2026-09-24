import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { env } from "@/config/env"
import { Box, Tab, Tabs, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { AppCalendar } from "@components/calendar/AppCalendar"
import { axiosClient } from "@lib/api/axios"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ActivityFormDrawer } from "../time-log-entries/_components/ActivityFormDrawer"
import type { CalendarEvent } from "@components/calendar/types"
import type { ColumnDef } from "@components/data-grid/types"
import { matterHearings } from "@/data/static"
import { formatCurrency } from "@lib/utils/formatCurrency"

interface EntryRow extends Record<string, unknown> {
  id: string
  title: string
  matterTitle?: string
  status?: string
  hearingTime?: string
  hours?: number
  note?: string
  clientName?: string
}

async function fetchHearingEvents(_range: { start: string; end: string }): Promise<CalendarEvent[]> {
  if (env.USE_STATIC_DATA) {
    return matterHearings.map(h => ({
      id: h.id,
      title: h.hearingTitle,
      start: h.hearingDate,
      end: h.hearingDate,
      color: "#0F3C6E",
      extendedProps: { ...h, matterId: "6a4f9f5e096c2631a41a8193" },
    }))
  }
  const res = await axiosClient.get("/api/calender/get")
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).map((e: Record<string, unknown>) => ({
    id: String(e.id ?? Math.random()),
    title: String(e.title ?? "Event"),
    start: String(e.startDateTime ?? e.start ?? ""),
    end: e.endDateTime ? String(e.endDateTime) : undefined,
    color: "#0F3C6E",
    extendedProps: e,
  }))
}

async function fetchHearingEntries(date: string): Promise<EntryRow[]> {
  if (env.USE_STATIC_DATA) {
    return matterHearings
      .filter(h => h.hearingDate === date)
      .map(h => ({ ...h, id: h.id, title: h.hearingTitle, hearingTime: h.hearingTime, status: h.status, matterTitle: "260303 — Building Dispute" }))
  }
  const d = new Date(date)
  const res = await axiosClient.get("/api/hearing/monthly-all", {
    params: { hDate: date, month: d.getMonth() + 1, year: d.getFullYear() },
  })
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).filter((h: Record<string, unknown>) =>
    String(h.hearingDate ?? "").slice(0, 10) === date,
  ) as EntryRow[]
}

async function fetchActivityEvents(range: { start: string; end: string }): Promise<CalendarEvent[]> {
  const start = new Date(range.start)
  const month = start.getMonth() + 1
  const year = start.getFullYear()
  if (env.USE_STATIC_DATA) {
    return [
      { id: "d1", title: "6.5h", start: `${year}-${String(month).padStart(2, "0")}-05`, color: "#2E7D32", extendedProps: { hours: 6.5 } },
      { id: "d2", title: "4.0h", start: `${year}-${String(month).padStart(2, "0")}-12`, color: "#2E7D32", extendedProps: { hours: 4 } },
      { id: "d3", title: "8.0h", start: `${year}-${String(month).padStart(2, "0")}-18`, color: "#2E7D32", extendedProps: { hours: 8 } },
    ]
  }
  const res = await axiosClient.get("/api/activity/activity/group", { params: { month, year } })
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).map((e: Record<string, unknown>, i: number) => {
    const date = String(e.date ?? e.entryDate ?? e.day ?? "")
    const hours = Number(e.totalHours ?? e.hours ?? e.time ?? 0)
    const amount = Number(e.disbursement ?? e.amount ?? 0)
    const title = hours ? `${hours.toFixed(1)}h` : amount ? `DR: ${formatCurrency(amount)}` : "Activity"
    return {
      id: String(e.id ?? `${date}-${i}`),
      title,
      start: date.slice(0, 10),
      color: "#2E7D32",
      extendedProps: e,
    }
  }).filter(e => e.start)
}

async function fetchActivityEntries(date: string): Promise<EntryRow[]> {
  if (env.USE_STATIC_DATA) {
    return [
      { id: "a1", title: "Legal research", matterTitle: "260303", hours: 2.5, clientName: "Al Rashid Holdings", note: "Case law" },
      { id: "a2", title: "Drafting", matterTitle: "260303", hours: 1.5, clientName: "Al Rashid Holdings", note: "Reply letter" },
    ]
  }
  const res = await axiosClient.get("/api/activity/by/date/v2", { params: { date } })
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).map((a: Record<string, unknown>, i: number) => ({
    id: String(a.id ?? i),
    title: String(a.activity ?? a.activityName ?? a.activityRelatedTo ?? "Activity"),
    matterTitle: String((a.matter as { title?: string } | undefined)?.title ?? a.matterTitle ?? "—"),
    clientName: String((a.client as { companyName?: string } | undefined)?.companyName ?? a.clientName ?? "—"),
    hours: Number(a.totalHours ?? a.hours ?? 0) + Number(a.minutes ?? 0) / 60,
    note: String(a.note ?? ""),
    status: String(a.status ?? a.billingType ?? ""),
  }))
}

const hearingColumns: ColumnDef<EntryRow>[] = [
  { field: "title", header: "Hearing" },
  { field: "matterTitle", header: "Matter" },
  { field: "hearingTime", header: "Time" },
  { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
]

const activityColumns: ColumnDef<EntryRow>[] = [
  { field: "title", header: "Activity" },
  { field: "clientName", header: "Client" },
  { field: "matterTitle", header: "Matter" },
  { field: "hours", header: "Hours", align: "right", renderCell: v => Number(v ?? 0).toFixed(1) },
  { field: "note", header: "Note" },
]

export default function CalendarPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const isActivity = tab === 0
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editActivityId, setEditActivityId] = useState<string | undefined>()
  const [prefillDate, setPrefillDate] = useState<string | undefined>()

  return (
    <PageShell title="Calendar" description="Time entries and hearings">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Time Log" />
          <Tab label="Hearings" />
        </Tabs>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        {isActivity ? "Activity Calendar" : "Hearing Calendar"}
      </Typography>
      <AppCalendar
        key={isActivity ? "activity" : "hearing"}
        queryFn={isActivity ? fetchActivityEvents : fetchHearingEvents}
        entryQueryFn={isActivity ? fetchActivityEntries : fetchHearingEntries}
        entryColumns={isActivity ? activityColumns : hearingColumns}
        onAddEntry={isActivity ? (date) => {
          setEditActivityId(undefined)
          setPrefillDate(date)
          setDrawerOpen(true)
        } : undefined}
        onEditEntry={isActivity ? (row) => {
          setEditActivityId(String(row.id))
          setPrefillDate(undefined)
          setDrawerOpen(true)
        } : undefined}
        onEventClick={(event) => {
          if (isActivity) {
            setEditActivityId(undefined)
            setPrefillDate(event.start?.slice(0, 10))
            setDrawerOpen(true)
            return
          }
          const matterId = (event.extendedProps as Record<string, unknown> | undefined)?.matterId
          if (matterId) navigate(`/matters/${matterId}`)
        }}
      />
      <ActivityFormDrawer
        open={drawerOpen}
        activityId={editActivityId}
        prefillEntryDate={prefillDate}
        onClose={() => { setDrawerOpen(false); setEditActivityId(undefined) }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["calendar"] })
        }}
      />
    </PageShell>
  )
}
