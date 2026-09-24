import type { ColumnDef } from '@components/data-grid/types'
export interface CalendarEvent { id:string; title:string; start:string; end?:string; color?:string; extendedProps?:Record<string,unknown> }
export interface AppCalendarProps<TEntry=unknown> {
  queryFn:(range:{start:string;end:string})=>Promise<CalendarEvent[]>
  entryQueryFn?:(date:string)=>Promise<TEntry[]>
  entryColumns?:ColumnDef<TEntry>[]
  onEventClick?:(event:CalendarEvent)=>void
  /** Open create flow for the selected day (Time Log tab). */
  onAddEntry?:(date:string)=>void
  /** Open edit flow for a day-list row. */
  onEditEntry?:(row:TEntry, date:string)=>void
  views?:string[]
  initialView?:string
}
