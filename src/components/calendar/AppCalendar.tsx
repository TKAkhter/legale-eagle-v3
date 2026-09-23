import { useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Box, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { CalendarDayPopover } from './CalendarDayPopover'
import type { AppCalendarProps, CalendarEvent } from './types'
import type { ColumnDef } from '@components/data-grid/types'

export function AppCalendar<TEntry extends Record<string,unknown>>({
  queryFn, entryQueryFn, entryColumns=[], onEventClick,
  views=['dayGridMonth','timeGridWeek','timeGridDay'], initialView='dayGridMonth'
}: AppCalendarProps<TEntry>) {
  const [range, setRange] = useState({ start:'', end:'' })
  const [anchor, setAnchor] = useState<HTMLElement|null>(null)
  const [selectedDate, setSelectedDate] = useState<string|null>(null)

  const { data: events=[] } = useQuery({
    queryKey: ['calendar','events',range], queryFn: ()=>queryFn(range),
    enabled: !!range.start
  })

  const handleDateClick = useCallback((info:{dateStr:string;dayEl:HTMLElement}) => {
    setSelectedDate(info.dateStr); setAnchor(info.dayEl)
  }, [])

  const handleEventClick = useCallback((info:{event:{id:string;title:string;startStr:string;endStr:string;extendedProps:Record<string,unknown>}}) => {
    onEventClick?.({ id:info.event.id, title:info.event.title, start:info.event.startStr, end:info.event.endStr, extendedProps:info.event.extendedProps })
  }, [onEventClick])

  return (
    <Paper variant="outlined" sx={{ p:2, borderRadius:2 }}>
      <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView} headerToolbar={{ left:'prev,next today', center:'title', right:views.join(',') }}
        events={events.map((e:CalendarEvent)=>({ id:e.id, title:e.title, start:e.start, end:e.end, backgroundColor:e.color, extendedProps:e.extendedProps }))}
        dateClick={handleDateClick} eventClick={handleEventClick}
        datesSet={(info)=>setRange({ start:info.startStr, end:info.endStr })}
        height="auto" />
      <CalendarDayPopover anchorEl={anchor} date={selectedDate} onClose={()=>setAnchor(null)}
        entryQueryFn={entryQueryFn} columns={entryColumns as ColumnDef<Record<string,unknown>>[]} />
    </Paper>
  )
}
