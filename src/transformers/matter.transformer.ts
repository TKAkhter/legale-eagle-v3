/**
 * matter.transformer.ts
 * BE → canonical Matter shape.
 */
import { logger } from "@/lib/logger"

export interface RawMatter {
  id?:           string
  matterId?:     string
  title?:        string
  matterSeq?:    string | number
  practiceArea?: { id: string; name: string } | string
  description?:  string
  matterSubject?:string
  billingType?:  string
  responsibleAttorney?: { id: string; firstName: string; lastName: string }
  lawyers?:      string
  status?:       string
  clientMini?: {
    id?: string; clientId?: string; clientType?: string
    firstName?: string; companyName?: string
  }
  createdAt?: string | number
  openDate?:  string
}

export interface Matter {
  id:            string
  matterId:      string
  title:         string
  practiceArea:  string
  practiceAreaId:string
  description:   string
  billingType:   string
  attorneyName:  string
  attorneyId:    string
  clientName:    string
  clientId:      string
  clientType:    string
  status:        string
  createdAt:     string
  openDate:      string
}

export function transformMatter(raw: RawMatter): Matter {
  const id = raw.id ?? raw.matterId ?? ""
  if (!id) logger.warn("transformMatter", "Matter missing id", raw)

  const pa    = typeof raw.practiceArea === "object" ? raw.practiceArea : null
  const atty  = raw.responsibleAttorney
  const client= raw.clientMini

  return {
    id,
    matterId:      raw.matterId ?? id,
    title:         raw.title ?? String(raw.matterSeq ?? ""),
    practiceArea:  pa?.name ?? (typeof raw.practiceArea === "string" ? raw.practiceArea : ""),
    practiceAreaId:pa?.id ?? "",
    description:   raw.matterSubject ?? raw.description ?? "",
    billingType:   raw.billingType ?? "",
    attorneyName:  atty ? `${atty.firstName} ${atty.lastName}`.trim() : (raw.lawyers ?? ""),
    attorneyId:    atty?.id ?? "",
    clientName:    client?.companyName || client?.firstName || "",
    clientId:      client?.clientId ?? client?.id ?? "",
    clientType:    client?.clientType ?? "",
    status:        raw.status ?? "",
    createdAt:     raw.createdAt ? String(raw.createdAt) : "",
    openDate:      raw.openDate ?? "",
  }
}
