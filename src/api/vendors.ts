import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import type { GridParams, PageResponse } from "@/types/common.types"

function pageOf<T>(rows: T[], p: GridParams): PageResponse<T> {
  const start = p.page * p.pageSize
  const slice = rows.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= rows.length,
    empty: slice.length === 0,
  }
}

const STATIC_VENDORS = [
  {
    id: "v1",
    displayName: "Gulf Courier LLC",
    companyName: "Gulf Courier LLC",
    vendorType: "COMPANY",
    trnNo: "100123456700003",
    active: true,
    billingAddress: { street: "Sheikh Zayed Rd", city: "Dubai", state: "Dubai", zip: "00000", country: "UAE" },
    shippingAddress: { street: "Sheikh Zayed Rd", city: "Dubai", state: "Dubai", zip: "00000", country: "UAE" },
    contactPersons: [
      { firstName: "Ahmed", lastName: "Hassan", email: { emailId: "ahmed@gulfcourier.ae" }, phone: { codeNo: "+971", phoneNo: "501234567" }, primary: true },
      { firstName: "Layla", lastName: "Khan", email: { emailId: "layla@gulfcourier.ae" }, phone: { codeNo: "+971", phoneNo: "502222333" } },
    ],
  },
  {
    id: "v2",
    displayName: "Legal Translations Co",
    companyName: "Legal Translations Co",
    vendorType: "COMPANY",
    trnNo: "",
    active: true,
    billingAddress: { street: "Business Bay", city: "Dubai", state: "Dubai", zip: "", country: "UAE" },
    shippingAddress: { street: "", city: "", state: "", zip: "", country: "" },
    contactPersons: [{ firstName: "Sara", lastName: "Ali", email: { emailId: "sara@legaltrans.ae" }, phone: { codeNo: "+971", phoneNo: "559876543" }, primary: true }],
  },
]

export const vendorsApi = {
  async getAll(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const f = p.filters ?? {}
    const search = String(f.searchText ?? "").trim()
    const includeInactive = f.includeInactive === true || f.includeInactive === "true"
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 200))
      let rows = STATIC_VENDORS as Record<string, unknown>[]
      if (search) {
        const q = search.toLowerCase()
        rows = rows.filter(v =>
          String(v.displayName ?? "").toLowerCase().includes(q)
          || String(v.companyName ?? "").toLowerCase().includes(q),
        )
      }
      if (!includeInactive) rows = rows.filter(v => v.active !== false)
      return pageOf(rows, p)
    }
    const path = search ? "/api/vendor/search" : "/api/vendor/get"
    const res = await axiosClient.get(path, {
      params: {
        page: p.page,
        size: p.pageSize,
        sortBy: p.sortBy ?? "createdAt",
        sortDirection: (p.sortDir ?? "desc").toUpperCase(),
        includeInactive,
        ...(search ? { text: search } : {}),
      },
    })
    const d = res.data?.data ?? res.data ?? {}
    const content = (Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : []) as Record<string, unknown>[]
    return {
      content,
      totalElements: Number(d.totalElements ?? content.length),
      totalPages: Number(d.totalPages ?? (Math.ceil(content.length / p.pageSize) || 0)),
      number: Number(d.number ?? p.page),
      size: Number(d.size ?? p.pageSize),
      first: Boolean(d.first ?? p.page === 0),
      last: Boolean(d.last ?? true),
      empty: content.length === 0,
    }
  },

  async getById(id: string) {
    if (env.USE_STATIC_DATA) {
      return STATIC_VENDORS.find(v => v.id === id) ?? STATIC_VENDORS[0]
    }
    const res = await axiosClient.get(`/api/vendor/get/${id}`)
    return res.data?.data ?? res.data
  },

  async create(data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      return { id: "v-new" }
    }
    const res = await axiosClient.post("/api/vendor/add", data)
    return res.data?.data ?? res.data
  },

  async update(id: string, data: Record<string, unknown>) {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    await axiosClient.put(`/api/vendor/update/${id}`, data)
  },

  async setStatus(id: string, active: boolean): Promise<string> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 250)); return active ? "Vendor activated." : "Vendor deactivated." }
    const res = await axiosClient.put(`/api/vendor/status/${id}`, null, { params: { active } })
    return res.data?.Msg ?? res.data?.message ?? (active ? "Vendor activated." : "Vendor deactivated.")
  },
}
