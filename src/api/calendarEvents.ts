import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export type CalendarEventPayload = {
  title: string
  eventType: "MATTER" | "LEAD"
  meetingWith: string
  location: string
  startDateTime: string
  endDateTime: string
  note: string
  remainder: boolean
}

export type CalendarEventRow = {
  id: string
  title: string
  eventType?: string
  clientId?: string
  eventWith?: string
  meeting?: boolean
  location?: string
  startDateTime?: string
  endDateTime?: string
  note?: string
}

const STATIC_EVENTS: CalendarEventRow[] = [
  {
    id: "ce1",
    title: "Client strategy call",
    eventType: "MATTER",
    clientId: "c1",
    eventWith: "m1",
    meeting: false,
    location: "Office",
    startDateTime: "2026-09-26 10:00",
    endDateTime: "2026-09-26 11:00",
    note: "Prep notes",
  },
]

/** Format like OLD useDate: `YYYY-MM-DD HH:mm` */
export function formatCalendarDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const calendarEventsApi = {
  async list(): Promise<CalendarEventRow[]> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 150))
      return STATIC_EVENTS
    }
    const res = await axiosClient.get("/api/calender/get")
    const list = res.data?.data ?? res.data ?? []
    return Array.isArray(list) ? list : []
  },

  async create(payload: CalendarEventPayload): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Event created."
    }
    const res = await axiosClient.post("/api/calender/add", payload)
    return res.data?.Msg ?? res.data?.message ?? "Event created."
  },

  async update(eventId: string, payload: CalendarEventPayload): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 250))
      return "Event updated."
    }
    const res = await axiosClient.post("/api/calender/edit", payload, {
      params: { eventId },
    })
    return res.data?.Msg ?? res.data?.message ?? "Event updated."
  },
}
