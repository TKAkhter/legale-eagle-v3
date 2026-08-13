import { env } from '@/config/env'
import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { AppCalendar } from '@components/calendar/AppCalendar'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import type { CalendarEvent } from '@components/calendar/types'
import type { ColumnDef } from '@components/data-grid/types'

interface HearingEntry extends Record<string, unknown> { id: string; caseNo?: string; matterTitle?: string; status?: string }

async function fetchHearings(range: { start: string; end: string }): Promise<CalendarEvent[]> {
  const d = new Date(range.start)
  const r = await axiosClient.get('/api/hearing/monthly-all', { params: { month: d.getMonth() + 1, year: d.getFullYear() } })
  const list: Record<string, unknown>[] = r.data?.data ?? r.data ?? []
  return list.map(h => ({
    id: String(h.id ?? Math.random()),
    title: String(h.caseNo ?? h.matterTitle ?? 'Hearing'),
    start: String(h.hearingDate ?? range.start),
    color: '#0ea5e9',
    extendedProps: h,
  }))
}

async function fetchDayEntries(date: string): Promise<HearingEntry[]> {
  const d = new Date(date)
  const r = await axiosClient.get('/api/hearing/monthly-all', { params: { hDate: date, month: d.getMonth() + 1, year: d.getFullYear() } })
  const list: HearingEntry[] = r.data?.data ?? r.data ?? []
  return list.filter(h => String(h.hearingDate ?? '').slice(0, 10) === date)
}

const columns: ColumnDef<HearingEntry>[] = [
  { field: 'caseNo', header: 'Case No' },
  { field: 'matterTitle', header: 'Matter' },
  { field: 'hearingTime', header: 'Time' },
  { field: 'status', header: 'Status', renderCell: (v) => <StatusBadge status={String(v ?? '')} /> },
]

export default function HearingCalendarPage() {
  const navigate = useNavigate()
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Team Hearing Calendar</Typography>
      <AppCalendar
        queryFn={fetchHearings} entryQueryFn={fetchDayEntries} entryColumns={columns}
        onEventClick={e => { const m = (e.extendedProps as Record<string, unknown>)?.matterId; if (m) navigate(`/matters/${m}`) }}
      />
    </Box>
  )
}
