/**
 * Team Hearing Calendar — LMS `/calender/hearing`.
 * Month/Week/Day calendar + attorney filter + Add/Continue hearing drawers + Outlook save.
 */
import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Paper, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EventAvailableIcon from "@mui/icons-material/EventAvailable"
import { PageShell } from "@/components/ui/PageShell"
import { AppCalendar } from "@components/calendar/AppCalendar"
import { StatusBadge } from "@components/ui/StatusBadge"
import { UserSelectFilter } from "@/components/filters/UserSelectFilter"
import { HearingFormDrawer } from "@/app/(dashboard)/matters/_components/HearingFormDrawer"
import { ContinueHearingDrawer } from "@/app/(dashboard)/matters/_components/ContinueHearingDrawer"
import { axiosClient } from "@lib/api/axios"
import { adminApi } from "@/api/admin"
import { env } from "@/config/env"
import { useAuthStore } from "@lib/store/authStore"
import { saveHearingToOutlook } from "@/lib/outlook/calendar"
import { toast } from "@/lib/toast"
import type { CalendarEvent } from "@components/calendar/types"
import type { ColumnDef } from "@components/data-grid/types"

interface HearingEntry extends Record<string, unknown> {
  id: string
  caseNo?: string
  caseYear?: string
  matterTitle?: string
  matterId?: string
  clientName?: string
  clientId?: string
  hearingDate?: string
  hearingTime?: string
  nextHearingDate?: string
  status?: string
  location?: string
  chamberNo?: string
  attorneyId?: string
  attorneyName?: string
  attendedAttorneyId?: string
  instruction?: string
  decisionSummary?: string
  caseType?: string
  meetingId?: string
  hearingId?: string
}

const ATTORNEY_KEY = "hearingCalendar.selectedAttorney"

function loadStoredAttorney(userId?: string): string {
  try {
    const stored = localStorage.getItem(ATTORNEY_KEY)
    if (stored !== null) return stored
  } catch { /* ignore */ }
  return userId ?? ""
}

function mapHearing(h: Record<string, unknown>): HearingEntry {
  const attorney = h.attorney as { id?: string; firstName?: string; lastName?: string } | undefined
  const attended = h.attendedAttorney as { id?: string } | undefined
  const client = h.client as { id?: string; companyName?: string; name?: string; clientType?: string; clientName?: string; firstName?: string } | undefined
  const matter = h.matter as { id?: string; title?: string } | undefined
  const clientName = client?.clientType === "COMPANY"
    ? (client.companyName ?? client.name)
    : (client?.clientName ?? client?.name ?? client?.firstName)
  return {
    ...h,
    id: String(h.id ?? h.hearingId ?? Math.random()),
    hearingId: String(h.hearingId ?? h.id ?? ""),
    caseNo: String(h.caseNo ?? "—"),
    caseYear: String(h.caseYear ?? ""),
    matterTitle: String(h.matterTitle ?? matter?.title ?? "—"),
    matterId: String(h.matterId ?? matter?.id ?? ""),
    clientName: String(h.clientName ?? clientName ?? "—"),
    clientId: String(h.clientId ?? client?.id ?? ""),
    hearingDate: String(h.hearingDate ?? ""),
    hearingTime: String(h.hearingTime ?? h.time ?? ""),
    nextHearingDate: String(h.nextHearingDate ?? ""),
    status: String(h.status ?? ""),
    location: String(h.location ?? h.hearingLocation ?? "—"),
    chamberNo: String(h.chamberNo ?? "—"),
    attorneyId: String(h.attorneyId ?? attorney?.id ?? ""),
    attorneyName: String(
      h.attorneyName
      || (attorney ? `${attorney.firstName ?? ""} ${attorney.lastName ?? ""}`.trim() : "")
      || "—",
    ),
    attendedAttorneyId: String(h.attendedAttorneyId ?? attended?.id ?? ""),
    instruction: String(h.instruction ?? h.instructions ?? "—"),
    decisionSummary: String(h.decisionSummary ?? h.previousDecision ?? h.summary ?? "—"),
    caseType: String(h.caseType ?? "—"),
    meetingId: h.meetingId ? String(h.meetingId) : undefined,
  }
}

export default function HearingCalendarPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [attorneyId, setAttorneyId] = useState(() => loadStoredAttorney(user?.id))
  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState<string | undefined>()
  const [continueRow, setContinueRow] = useState<HearingEntry | null>(null)
  const [outlookRow, setOutlookRow] = useState<HearingEntry | null>(null)
  const [outlookSaving, setOutlookSaving] = useState(false)

  const companyQ = useQuery({
    queryKey: ["company", "info", "oneDrive"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
    staleTime: 5 * 60_000,
  })
  const oneDriveEnabled = Boolean(companyQ.data?.oneDrive)

  const usersQ = useQuery({
    queryKey: ["admin", "users", "mini", "outlook"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: oneDriveEnabled,
    staleTime: 5 * 60_000,
  })
  const locationsQ = useQuery({
    queryKey: ["lookups", "locations", "outlook"],
    queryFn: () => adminApi.getLocations(),
    enabled: oneDriveEnabled,
    staleTime: 5 * 60_000,
  })

  const filterByAttorney = useCallback((rows: HearingEntry[]) => {
    if (!attorneyId) return rows
    return rows.filter(h => !h.attorneyId || h.attorneyId === attorneyId)
  }, [attorneyId])

  async function fetchHearings(range: { start: string; end: string }): Promise<CalendarEvent[]> {
    if (env.USE_STATIC_DATA) {
      const staticRows = filterByAttorney([
        mapHearing({
          id: "h1",
          caseNo: "C-100",
          matterTitle: "260303",
          matterId: "m1",
          hearingDate: range.start.slice(0, 10) + "T10:00:00",
          hearingTime: "10:00",
          attorneyId: user?.id,
          attorneyName: "You",
          status: "Scheduled",
          clientName: "Al Rashid",
        }),
      ])
      return staticRows.map(h => ({
        id: h.id,
        title: `${h.caseNo} — ${h.hearingTime || "Hearing"}`,
        start: String(h.hearingDate),
        color: "#0ea5e9",
        extendedProps: h as unknown as Record<string, unknown>,
      }))
    }
    const start = new Date(range.start)
    const end = new Date(range.end)
    const months: { month: number; year: number }[] = []
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cursor <= end) {
      months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    const lists = await Promise.all(
      months.map(async ({ month, year }) => {
        const r = await axiosClient.get("/api/hearing/monthly-all", { params: { month, year } })
        const list: Record<string, unknown>[] = r.data?.data ?? r.data ?? []
        return Array.isArray(list) ? list : []
      }),
    )
    const byId = new Map<string, HearingEntry>()
    for (const row of lists.flat().map(mapHearing)) {
      byId.set(row.id, row)
    }
    return filterByAttorney([...byId.values()]).map(h => ({
      id: h.id,
      title: `${h.caseNo ?? "Hearing"}${h.hearingTime ? ` — ${h.hearingTime}` : ""}`,
      start: String(h.hearingDate || range.start),
      color: "#0ea5e9",
      extendedProps: h as unknown as Record<string, unknown>,
    }))
  }

  async function fetchDayEntries(date: string): Promise<HearingEntry[]> {
    if (env.USE_STATIC_DATA) {
      return filterByAttorney([
        mapHearing({
          id: "h1",
          caseNo: "C-100",
          matterTitle: "260303",
          matterId: "m1",
          hearingDate: date,
          hearingTime: "10:00",
          attorneyId: user?.id,
          status: "Scheduled",
          clientName: "Al Rashid",
          location: "Dubai Courts",
        }),
      ])
    }
    const d = new Date(date)
    const r = await axiosClient.get("/api/hearing/monthly-all", {
      params: { hDate: date, month: d.getMonth() + 1, year: d.getFullYear() },
    })
    const list: Record<string, unknown>[] = r.data?.data ?? r.data ?? []
    const rows = (Array.isArray(list) ? list : []).map(mapHearing)
      .filter(h => String(h.hearingDate ?? "").slice(0, 10) === date)
    return filterByAttorney(rows)
  }

  async function confirmSaveOutlook() {
    if (!outlookRow || outlookSaving) return
    setOutlookSaving(true)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
        toast.success("Saved to Outlook successfully")
      } else {
        const attorneys = ((usersQ.data ?? []) as Record<string, unknown>[]).map(u => ({
          id: String(u.id ?? ""),
          firstName: String(u.firstName ?? ""),
          lastName: String(u.lastName ?? ""),
          email: String(u.email ?? ""),
        }))
        const locations = ((locationsQ.data ?? []) as Record<string, unknown>[]).map(l => ({
          id: String(l.id ?? ""),
          name: String(l.name ?? ""),
        }))
        await saveHearingToOutlook(
          {
            ...outlookRow,
            hearingLocation: outlookRow.location,
            matterName: outlookRow.matterTitle,
          },
          attorneys,
          locations,
        )
        toast.success("Saved to Outlook successfully")
        invalidateCalendar()
      }
      setOutlookRow(null)
    } catch {
      toast.error("Failed to save to Outlook")
    } finally {
      setOutlookSaving(false)
    }
  }

  const columns: ColumnDef<HearingEntry>[] = useMemo(() => {
    const cols: ColumnDef<HearingEntry>[] = [
      {
        field: "status",
        header: "Continue",
        width: 100,
        renderCell: (_v, row) => {
          const status = String(row.status ?? "").toUpperCase()
          const closed = status === "CLOSED" || status === "CLOSE"
          if (closed || !row.matterId) return "—"
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={e => {
                e.stopPropagation()
                setContinueRow(row)
              }}
            >
              Continue
            </Button>
          )
        },
      },
    ]
    if (oneDriveEnabled) {
      cols.push({
        field: "meetingId",
        header: "Outlook",
        width: 120,
        renderCell: (_v, row) => {
          const already = Boolean(row.meetingId)
          return (
            <Button
              size="small"
              variant="text"
              disabled={already}
              startIcon={<EventAvailableIcon fontSize="small" />}
              title={already ? "Hearing already added in Outlook Calendar" : "Save Hearing in Outlook Calendar"}
              onClick={e => {
                e.stopPropagation()
                setOutlookRow(row)
              }}
            >
              {already ? "Saved" : "Save"}
            </Button>
          )
        },
      })
    }
    cols.push(
      {
        field: "hearingTime",
        header: "Time",
        width: 80,
        renderCell: (v, row) => String(v || String(row.hearingDate ?? "").slice(11, 16) || "—"),
      },
      { field: "caseNo", header: "Case No", width: 100 },
      { field: "caseType", header: "Case Type", width: 110 },
      {
        field: "clientName",
        header: "Client",
        renderCell: (v, row) => {
          if (!row.clientId) return String(v || "—")
          return (
            <Link component="button" type="button" underline="hover" onClick={e => { e.stopPropagation(); navigate(`/clients/${row.clientId}`) }}>
              {String(v || "—")}
            </Link>
          )
        },
      },
      {
        field: "matterTitle",
        header: "Matter",
        renderCell: (v, row) => {
          if (!row.matterId) return String(v || "—")
          return (
            <Link component="button" type="button" underline="hover" onClick={e => { e.stopPropagation(); navigate(`/matters/${row.matterId}`) }}>
              {String(v || "—")}
            </Link>
          )
        },
      },
      { field: "attorneyName", header: "Attorney" },
      { field: "location", header: "Location" },
      { field: "chamberNo", header: "Chamber", width: 90 },
      { field: "instruction", header: "Instruction" },
      { field: "decisionSummary", header: "Decision" },
      {
        field: "status",
        header: "Status",
        width: 110,
        renderCell: v => <StatusBadge status={String(v ?? "")} />,
      },
    )
    return cols
  }, [navigate, oneDriveEnabled])

  function invalidateCalendar() {
    qc.invalidateQueries({ queryKey: ["calendar"] })
  }

  return (
    <PageShell
      title="Hearing Calendar"
      description="Team hearings by month, week, and day"
      action={
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setAddDate(undefined); setAddOpen(true) }}
        >
          Add Hearing
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <UserSelectFilter
            value={attorneyId}
            label="Attorney"
            onChange={v => {
              const next = v ?? ""
              setAttorneyId(next)
              try { localStorage.setItem(ATTORNEY_KEY, next) } catch { /* ignore */ }
              invalidateCalendar()
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {attorneyId ? "Showing hearings for selected attorney" : "Showing all attorneys (clear filter)"}
          </Typography>
        </Box>
      </Paper>

      <AppCalendar<HearingEntry>
        key={attorneyId || "all"}
        queryFn={fetchHearings}
        entryQueryFn={fetchDayEntries}
        entryColumns={columns}
        onAddEntry={date => { setAddDate(date); setAddOpen(true) }}
        onEventClick={e => {
          const m = (e.extendedProps as HearingEntry)?.matterId
          if (m) navigate(`/matters/${m}`)
        }}
      />

      <HearingFormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initial={addDate ? { hearingDate: addDate } : undefined}
        onSuccess={() => {
          setAddOpen(false)
          invalidateCalendar()
        }}
      />

      <ContinueHearingDrawer
        open={!!continueRow}
        onClose={() => setContinueRow(null)}
        matterId={String(continueRow?.matterId ?? "")}
        hearing={continueRow}
        onSuccess={() => {
          setContinueRow(null)
          invalidateCalendar()
        }}
      />

      <Dialog open={!!outlookRow} onClose={() => !outlookSaving && setOutlookRow(null)}>
        <DialogTitle>Save Hearing in Outlook Calendar</DialogTitle>
        <DialogContent>
          Are you sure you want to save this hearing as an Outlook meeting?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutlookRow(null)} disabled={outlookSaving}>Cancel</Button>
          <Button variant="contained" disabled={outlookSaving} onClick={() => { void confirmSaveOutlook() }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
