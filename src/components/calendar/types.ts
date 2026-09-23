import type { ColumnDef } from '@components/data-grid/types'
export interface CalendarEvent { id:string; title:string; start:string; end?:string; color?:string; extendedProps?:Record<string,unknown> }
export interface AppCalendarProps<TEntry=unknown> {
  queryFn:(range:{start:string;end:string})=>Promise<CalendarEvent[]>
  entryQueryFn?:(date:string)=>Promise<TEntry[]>
  entryColumns?:ColumnDef<TEntry>[]
  onEventClick?:(event:CalendarEvent)=>void
  views?:string[]
  initialView?:string
}
