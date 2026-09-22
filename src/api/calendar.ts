import { env } from "@/config/env"
import { axiosClient } from "@/lib/api/axios"
import { matterHearings as staticHearings } from "@/data/static"

/**
 * calendarApi — hearing calendar data.
 * All hearing/calendar endpoints consolidated here.
 */
export const calendarApi = {
  async getMonthlyHearings(year: number, month: number): Promise<Record<string,unknown>[]> {
    if (env.USE_STATIC_DATA) {
      return staticHearings.map(h => ({ ...h, startDate: h.hearingDate, endDate: h.hearingDate }))
    }
    const r = await axiosClient.get("/api/hearing/monthly-all", { params: { year, month } })
    return r.data?.data ?? r.data ?? []
  },

  async getTeamHearings(year: number, month: number): Promise<Record<string,unknown>[]> {
    if (env.USE_STATIC_DATA) {
      return staticHearings.map(h => ({ ...h, startDate: h.hearingDate, endDate: h.hearingDate }))
    }
    const r = await axiosClient.get("/api/hearing/monthly-all", { params: { year, month, teamView: true } })
    return r.data?.data ?? r.data ?? []
  },
}
