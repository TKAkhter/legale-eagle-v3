/**
 * lib/query/keys.ts — typed query key factory.
 *
 * Centralises all TanStack Query keys.
 *
 * Usage:
 *   import { QK } from "@/lib/query/keys"
 *   useQuery({ queryKey: QK.leads.list(params), queryFn: ... })
 *   qc.invalidateQueries({ queryKey: QK.leads.all() })
 */
import type { GridParams } from "@/types/common.types"

export const QK = {
  leads: {
    all:       ()              => ["leads"]                     as const,
    list:      (p: GridParams) => ["leads","list",p]            as const,
    detail:    (id: string)    => ["leads","detail",id]         as const,
    followups: (id: string)    => ["leads","followups",id]      as const,
    my:        ()              => ["leads","my"]                as const,
  },
  clients: {
    all:       ()              => ["clients"]                   as const,
    list:      (p: GridParams) => ["clients","list",p]          as const,
    detail:    (id: string)    => ["clients","detail",id]       as const,
    shortInfo: (q?: string)    => ["clients","shortInfo",q]     as const,
    matters:   (id: string)    => ["clients","matters",id]      as const,
    invoices:  (id: string)    => ["clients","invoices",id]     as const,
  },
  matters: {
    all:       ()              => ["matters"]                   as const,
    list:      (p: GridParams) => ["matters","list",p]          as const,
    detail:    (id: string)    => ["matters","detail",id]       as const,
    mini:      (q?: string)    => ["matters","mini",q]          as const,
    shortInfo: (q?: string)    => ["matters","shortInfo",q]     as const,
    timelogs:  (id: string)    => ["matters","timelogs",id]     as const,
    hearings:  (id: string)    => ["matters","hearings",id]     as const,
    tasks:     (id: string)    => ["matters","tasks",id]        as const,
    invoices:  (id: string)    => ["matters","invoices",id]     as const,
  },
  billing: {
    all:    ()              => ["billing"]                      as const,
    list:   (p: GridParams) => ["billing","list",p]             as const,
    detail: (id: string)    => ["billing","detail",id]          as const,
  },
  tasks: {
    all:    ()              => ["tasks"]                        as const,
    list:   (p: GridParams) => ["tasks","list",p]               as const,
    detail: (id: string)    => ["tasks","detail",id]            as const,
  },
  timelogs: {
    all:  ()              => ["timelogs"]                       as const,
    list: (p: GridParams) => ["timelogs","list",p]              as const,
  },
  lfa: {
    all:    ()              => ["lfa"]                          as const,
    list:   (p: GridParams) => ["lfa","list",p]                 as const,
    detail: (id: string)    => ["lfa","detail",id]              as const,
  },
  users: {
    all:    ()              => ["admin","users"]                as const,
    list:   (p?: GridParams)=> ["admin","users","list",p]       as const,
    detail: (id: string)    => ["admin","users","detail",id]    as const,
    mini:   ()              => ["admin","users","mini"]         as const,
  },
  groups: {
    list: () => ["admin","groups"] as const,
  },
  practiceAreas: {
    list: () => ["lookups","practiceAreas"] as const,
  },
  departments: {
    list: () => ["lookups","departments"] as const,
  },
  designations: {
    list: () => ["lookups","designations"] as const,
  },
  lookups: {
    practiceAreas: () => ["lookups","practiceAreas"]  as const,
    leadSources:   () => ["lookups","leadSources"]    as const,
    departments:   () => ["lookups","departments"]    as const,
    designations:  () => ["lookups","designations"]   as const,
  },
  reports: {
    wip:           (p: GridParams) => ["reports","wip",p]            as const,
    matterBilling: (p: GridParams) => ["reports","matter-billing",p] as const,
    utilization:   (p: GridParams) => ["reports","utilization",p]    as const,
    wipSummary:    ()              => ["reports","wip","summary"]     as const,
  },
  activity: {
    feed:     (limit: number) => ["activity","feed",limit]  as const,
    auditLog: (p: GridParams) => ["audit","log",p]           as const,
  },
  notifications: {
    list: () => ["notifications","list"] as const,
  },
  dashboard: {
    counts:  () => ["dashboard","counts"]  as const,
    history: () => ["dashboard","history"] as const,
    revenue: () => ["dashboard","revenue"] as const,
    setup:   () => ["dashboard","setup"]   as const,
  },
} as const
