import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { AppCalendar } from '@components/calendar/AppCalendar'
import { axiosClient } from '@lib/api/axios'
import { StatusBadge } from '@components/ui/StatusBadge'
import type { CalendarEvent } from '@components/calendar/types'
import type { ColumnDef } from '@components/data-grid/types'

interface EntryRow extends Record<string, unknown> {
  id: string
  title: string
  matterTitle?: string
  status?: string
  hearingTime?: string
}

async function fetchCalendarEvents(range: { start: string; end: string }): Promise<CalendarEvent[]> {
  const res = await axiosClient.get('/api/calender/get')
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).map((e: Record<string, unknown>) => ({
    id: String(e.id ?? Math.random()),
    title: String(e.title ?? 'Event'),
    start: String(e.startDateTime ?? e.start ?? range.start),
    end: e.endDateTime ? String(e.endDateTime) : undefined,
    color: '#0F3C6E',
    extendedProps: e,
  }))
}

async function fetchEntriesForDate(date: string): Promise<EntryRow[]> {
  // Hearings + calendar events for that date — combine from monthly hearing endpoint
  const d = new Date(date)
  const res = await axiosClient.get('/api/hearing/monthly-all', {
    params: { hDate: date, month: d.getMonth() + 1, year: d.getFullYear() },
  })
  const list = res.data?.data ?? res.data ?? []
  return (Array.isArray(list) ? list : []).filter((h: Record<string, unknown>) =>
    String(h.hearingDate ?? '').slice(0, 10) === date,
  ) as EntryRow[]
}

const entryColumns: ColumnDef<EntryRow>[] = [
  { field: 'caseNo', header: 'Case No' },
  { field: 'matterTitle', header: 'Matter' },
  { field: 'hearingTime', header: 'Time' },
  { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
]

export default function CalendarPage() {
  const navigate = useNavigate()
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Calendar</Typography>
      <AppCalendar
        queryFn={fetchCalendarEvents}
        entryQueryFn={fetchEntriesForDate}
        entryColumns={entryColumns}
        onEventClick={(event) => {
          const matterId = (event.extendedProps as Record<string, unknown> | undefined)?.matterId
          if (matterId) navigate(`/matters/${matterId}`)
        }}
      />
    </Box>
  )
}
