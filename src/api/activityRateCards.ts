/**
 * Activity rate card templates (LMS `/rate-cards`) — distinct from user hourly budgeting rates.
 */
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export type ActivityRateCard = {
  id: string
  title: string
  activityType: string
  billingType: string
  rate: number
}

export const activityRateCardsApi = {
  async getByType(activityType: "Time" | "Expense"): Promise<ActivityRateCard[]> {
    if (env.USE_STATIC_DATA) {
      const all: ActivityRateCard[] = [
        { id: "arc1", title: "Standard Research", activityType: "Time", billingType: "Hourly", rate: 250 },
        { id: "arc2", title: "Court Appearance", activityType: "Time", billingType: "Session", rate: 1500 },
        { id: "arc3", title: "Filing Fee", activityType: "Expense", billingType: "Expense", rate: 100 },
      ]
      return all.filter(r => r.activityType === activityType)
    }
    const res = await axiosClient.post(`/api/rate/card/get/by/type`, null, {
      params: { activityType },
    })
    const d = res.data?.data ?? res.data ?? []
    const list = Array.isArray(d) ? d : []
    return list.map((r: Record<string, unknown>, i: number) => ({
      id: String(r.id ?? `arc-${i}`),
      title: String(r.title ?? "—"),
      activityType: String(r.activityType ?? activityType),
      billingType: String(r.billingType ?? "NA"),
      rate: Number(r.rate ?? 0),
    }))
  },

  async create(data: {
    title: string
    activityType: "Time" | "Expense"
    billingType: string
    rate: number
  }): Promise<string> {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return "Rate card added."
    }
    const payload = {
      ...data,
      billingType: data.activityType === "Expense" ? "Expense" : data.billingType,
    }
    const res = await axiosClient.post("/api/rate/card/add", payload)
    return res.data?.Msg ?? res.data?.message ?? "Rate card added."
  },
}
