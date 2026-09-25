/**
 * lead.transformer.ts — BE → canonical Lead shape.
 */
import { logger } from "@/lib/logger"

export interface RawLead {
  id?: string
  leadId?: string
  firstName?: string
  lastName?: string
  companyName?: string
  leadType?: string
  type?: string
  typeLead?: string
  currentStatus?: string
  status?: string
  emails?: { emailId: string; type?: string; primary?: boolean }[]
  email?: string
  phones?: { phoneNo: string; type?: string; codeNo?: string; primary?: boolean }[]
  phone?: string
  practiceArea?: { id: string; name: string } | string
  leadSource?: { id: string; name: string } | string
  lawyer?: { id: string; firstName: string; lastName: string }
  attorneyName?: string
  description?: string
  comment?: string
  dispute?: string
  natureOfDispute?: string
  matterSubject?: string
  conflictCheckStatus?: string
  lastStatusUpdatedDate?: string
  followUpDate?: string
  followUpContent?: string
  createdBy?: string | { firstName?: string; lastName?: string; name?: string }
  addedByName?: string
  partyOpposing?: { firstName?: string; name?: string }[] | string
  department?: { id?: string; name?: string } | string
  createdAt?: string | number
  updatedAt?: string | number
  writeOff?: boolean
  repeated?: boolean
  converted?: boolean
  clientId?: string
  client?: { id?: string; clientId?: string }
  procuredByName?: string
  groupName?: string
  externalLeadId?: string
  nationality?: string
  proposedValue?: number
  approvedValue?: number
  leadEdited?: boolean
}

export interface Lead {
  id: string
  name: string
  firstName: string
  lastName: string
  companyName: string
  leadType: "PERSON" | "COMPANY" | "People" | "Company" | string
  status: string
  email: string
  phone: string
  practiceArea: string
  practiceAreaId: string
  leadSource: string
  leadSourceId: string
  attorneyName: string
  attorneyId: string
  description: string
  dispute: string
  conflictCheckStatus: string
  lastStatusUpdatedDate: string
  followUp: string
  createdBy: string
  partyOpposing: string
  department: string
  createdAt: string
  writeOff: boolean
  repeated: boolean
  converted: boolean
  /** Client linked after convert (OLD `lead.clientId`). */
  clientId: string
  externalLeadId: string
  nationality: string
  procuredByName: string
  groupName: string
  proposedValue: number | null
  approvedValue: number | null
}

function personLabel(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  const p = value as { firstName?: string; lastName?: string; name?: string }
  return p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
}

export function transformLead(raw: RawLead): Lead {
  const id = raw.id ?? raw.leadId ?? ""
  if (!id) logger.warn("transformLead", "Lead missing id", raw)

  // Old LMS detail uses `email` (array of {emailId, primary}), not `emails`.
  const emailList = Array.isArray(raw.emails)
    ? raw.emails
    : Array.isArray(raw.email)
      ? (raw.email as { emailId?: string; primary?: boolean }[])
      : []
  const primaryEmail = emailList.find(e => e?.primary && e?.emailId)?.emailId
  const email = primaryEmail
    ?? emailList.find(e => e?.emailId)?.emailId
    ?? (typeof raw.email === "string" ? raw.email : "")
  const phoneList = Array.isArray(raw.phones)
    ? raw.phones
    : Array.isArray(raw.phone)
      ? (raw.phone as { phoneNo?: string; codeNo?: string; primary?: boolean }[])
      : []
  const pickPhone = (p?: { phoneNo?: string; codeNo?: string }) => {
    if (!p?.phoneNo) return ""
    const code = String(p.codeNo ?? "").trim()
    const match = code.match(/\+?\d{1,4}/)
    const prefix = match ? (match[0].startsWith("+") ? match[0] : `+${match[0]}`) : ""
    return prefix ? `${prefix} ${p.phoneNo}` : p.phoneNo
  }
  const primaryPhone = pickPhone(phoneList.find(p => p?.primary && p?.phoneNo))
  const phone = primaryPhone
    || pickPhone(phoneList.find(p => p?.phoneNo))
    || (typeof raw.phone === "string" ? raw.phone : "")
  const practiceAreaObj = typeof raw.practiceArea === "object" && raw.practiceArea ? raw.practiceArea : null
  const practiceArea = practiceAreaObj?.name ?? (typeof raw.practiceArea === "string" ? raw.practiceArea : "")
  const practiceAreaId = practiceAreaObj?.id ?? ""
  // Detail page often has leadSource as a plain string; list may nest {id,name}.
  const leadSourceObj = typeof raw.leadSource === "object" && raw.leadSource ? raw.leadSource : null
  const leadSource = leadSourceObj?.name ?? (typeof raw.leadSource === "string" ? raw.leadSource : "")
  const leadSourceId = leadSourceObj?.id ?? ""
  // Old details display attorneyName; lawyer object is optional.
  const attorneyName = (raw.attorneyName ?? "").trim()
    || (raw.lawyer ? `${raw.lawyer.firstName ?? ""} ${raw.lawyer.lastName ?? ""}`.trim() : "")
  const firstName = raw.firstName ?? ""
  const lastName = raw.lastName ?? ""
  const leadType = raw.typeLead ?? raw.leadType ?? raw.type ?? "PERSON"
  const isCompany = leadType === "COMPANY" || leadType === "Company"
  const name = isCompany
    ? (raw.companyName ?? `${firstName} ${lastName}`.trim())
    : (`${firstName} ${lastName}`.trim() || raw.companyName || "")
  const status = raw.currentStatus ?? raw.status ?? ""
  const statusUpper = String(status).toUpperCase().replace(/\s+/g, "_")
  const writeOff = Boolean(raw.writeOff) || ["WRITE_OFF", "WRITEOFF", "WRITTEN_OFF"].includes(statusUpper)
  const converted = Boolean(raw.converted) || statusUpper === "CONVERTED"
  const createdAt = raw.createdAt
    ? typeof raw.createdAt === "number"
      ? new Date(raw.createdAt * 1000).toISOString()
      : String(raw.createdAt)
    : ""
  const opposing = Array.isArray(raw.partyOpposing)
    ? raw.partyOpposing.map(p => {
        if (!p) return ""
        if (typeof p === "string") return p
        return String(p.firstName || p.name || "").trim()
      }).filter(Boolean).join(", ")
    : String(raw.partyOpposing ?? "")
  const department = typeof raw.department === "object" ? (raw.department?.name ?? "") : String(raw.department ?? "")
  const clientId = String(
    raw.clientId
    ?? raw.client?.id
    ?? raw.client?.clientId
    ?? "",
  )

  return {
    id,
    name,
    firstName,
    lastName,
    companyName: raw.companyName ?? "",
    leadType,
    status,
    email,
    phone,
    practiceArea,
    practiceAreaId,
    leadSource,
    leadSourceId,
    attorneyName,
    attorneyId: raw.lawyer?.id ?? "",
    description: raw.natureOfDispute ?? raw.description ?? raw.comment ?? "",
    dispute: raw.natureOfDispute ?? raw.dispute ?? raw.matterSubject ?? "",
    conflictCheckStatus: raw.conflictCheckStatus ?? "",
    lastStatusUpdatedDate: raw.lastStatusUpdatedDate ?? "",
    followUp: raw.followUpContent ?? raw.followUpDate ?? "",
    createdBy: raw.addedByName || personLabel(raw.createdBy) || "",
    partyOpposing: opposing,
    department,
    createdAt,
    writeOff,
    repeated: Boolean(raw.repeated),
    converted,
    clientId,
    externalLeadId: String(raw.externalLeadId ?? ""),
    nationality: String(raw.nationality ?? ""),
    procuredByName: String(raw.procuredByName ?? ""),
    groupName: String(raw.groupName ?? ""),
    proposedValue: raw.proposedValue != null ? Number(raw.proposedValue) : null,
    approvedValue: raw.approvedValue != null ? Number(raw.approvedValue) : null,
  }
}
