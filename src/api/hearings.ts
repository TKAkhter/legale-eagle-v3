import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export const hearingsApi = {
  async continueHearing(data: FormData | Record<string, unknown>) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: "h-continued" }
    }
    const res = await axiosClient.post("/api/hearing/add/continue", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    })
    return res.data?.data ?? res.data
  },

  async closeHearing(hearingId: string, data: { closingDate?: string; decision?: string }) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: hearingId }
    }
    const res = await axiosClient.put(`/api/hearing/close/${hearingId}`, { hearingId, ...data })
    return res.data?.data ?? res.data
  },

  async getParentChild(parentId: string) {
    if (env.USE_STATIC_DATA) return []
    const res = await axiosClient.get("/api/hearing/get/parent/child", { params: { parentId } })
    return res.data?.data ?? res.data ?? []
  },
}
