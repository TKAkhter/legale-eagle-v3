/**
 * api/activity.ts — activity feed and audit log API.
 *
 * Activity feed: recent firm-wide actions shown on dashboard.
 * Audit log:     full history of who changed what — admin only.
 *
 * Static mode: uses activityFeed + auditLog from src/data/static.ts.
 * Live mode:   calls /api/activity/feed and /api/audit/log.
 */
import { env }    from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { activityFeed as staticFeed, auditLog as staticAudit } from "@/data/static"
import { logger } from "@/lib/logger"
import type { GridParams, PageResponse } from "@/types/common.types"

export interface ActivityItem {
  id:          string
  type:        string
  actor:       string
  entity:      string
  entityId:    string
  entityName:  string
  description: string
  createdAt:   string
}

export interface AuditEntry {
  id:        string
  actor:     string
  action:    string
  module:    string
  record:    string
  changes:   Record<string, { from: string; to: string }>
  ip:        string
  createdAt: string
}

export const activityApi = {
  /** Fetch recent firm-wide activity (dashboard feed widget) */
  async getFeed(limit = 10): Promise<ActivityItem[]> {
    if (env.USE_STATIC_DATA) {
      logger.debug("activityApi", `Returning ${limit} static activity items`)
      return (staticFeed as ActivityItem[]).slice(0, limit)
    }
    const r = await axiosClient.get("/api/activity/feed", { params: { limit } })
    return r.data?.data ?? []
  },

  /** Fetch audit log with pagination — admin only */
  async getAuditLog(p: GridParams): Promise<PageResponse<AuditEntry>> {
    if (env.USE_STATIC_DATA) {
      logger.debug("activityApi", "Returning static audit log")
      const f: AuditEntry[] = p.filters?.searchText
        ? (staticAudit as AuditEntry[]).filter(a =>
            `${a.actor} ${a.module} ${a.record} ${a.action}`.toLowerCase()
              .includes(String(f).toLowerCase())
          )
        : (staticAudit as AuditEntry[])
      const start = p.page * p.pageSize
      const slice = f.slice(start, start + p.pageSize)
      return { content: slice, totalElements: f.length, totalPages: Math.ceil(f.length / p.pageSize), number: p.page, size: p.pageSize, first: p.page === 0, last: (start + p.pageSize) >= f.length, empty: slice.length === 0 }
    }
    const r = await axiosClient.get("/api/audit/log", {
      params: { pageNumber: p.page, pageSize: p.pageSize, module: p.filters?.module ?? "", actor: p.filters?.actor ?? "", searchText: p.filters?.searchText ?? "" }
    })
    const d = r.data?.data ?? r.data
    return { content: d.content ?? [], totalElements: d.totalElements ?? 0, totalPages: d.totalPages ?? 0, number: d.number ?? 0, size: d.size ?? p.pageSize, first: d.first ?? true, last: d.last ?? true, empty: d.empty ?? true }
  },
}
