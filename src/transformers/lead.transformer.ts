/**
 * lead.transformer.ts
 *
 * Transforms the raw backend lead response into the canonical Lead type
 * that the FE components expect.
 *
 * Raw BE shape (from /api/leads/list/filter) may vary — this normalises it.
 * Update this file when the backend changes its response shape.
 */
import { logger } from "@/lib/logger"

/** Raw shape from the backend — may have snake_case, nested objects, etc. */
export interface RawLead {
  id?:            string
  leadId?:        string        // some endpoints use leadId instead of id
  firstName?:     string
  lastName?:      string
  companyName?:   string
  leadType?:      string
  currentStatus?: string
  status?:        string        // some endpoints use status instead of currentStatus
  emails?:        { emailId: string; type?: string; primary?: boolean }[]
  email?:         string        // some endpoints return flat email
  phones?:        { phoneNo: string; type?: string; codeNo?: string }[]
  phone?:         string        // some endpoints return flat phone
  practiceArea?:  { id: string; name: string } | string
  leadSource?:    { id: string; name: string } | string
  lawyer?:        { id: string; firstName: string; lastName: string }
  description?:   string
  createdAt?:     string | number
  updatedAt?:     string | number
}

/** Canonical Lead shape — what FE components always receive */
export interface Lead {
  id:            string
  name:          string       // computed: "First Last" or companyName
  firstName:     string
  lastName:      string
  companyName:   string
  leadType:      "PERSON" | "COMPANY"
  status:        string       // normalised from currentStatus OR status
  email:         string       // first email from emails[] or flat email
  phone:         string       // first phone from phones[] or flat phone
  practiceArea:  string       // name string, not object
  practiceAreaId:string
  leadSource:    string
  leadSourceId:  string
  attorneyName:  string       // "First Last" of assigned lawyer
  attorneyId:    string
  description:   string
  createdAt:     string       // ISO date string
}

/**
 * Transform one raw BE lead into the canonical FE Lead shape.
 * Safe to call with partial/unknown data — uses fallbacks throughout.
 */
export function transformLead(raw: RawLead): Lead {
  // id: prefer id, fall back to leadId
  const id = raw.id ?? raw.leadId ?? ""
  if (!id) logger.warn("transformLead", "Lead missing id", raw)

  // email: prefer first item from emails array, fall back to flat email field
  const email = raw.emails?.[0]?.emailId ?? raw.email ?? ""

  // phone: prefer first item from phones array, fall back to flat phone field
  const phone = raw.phones?.[0]?.phoneNo ?? raw.phone ?? ""

  // practiceArea: can be object { id, name } or just a string
  const practiceAreaObj = typeof raw.practiceArea === "object" ? raw.practiceArea : null
  const practiceArea    = practiceAreaObj?.name ?? (typeof raw.practiceArea === "string" ? raw.practiceArea : "")
  const practiceAreaId  = practiceAreaObj?.id ?? ""

  // leadSource: same pattern as practiceArea
  const leadSourceObj = typeof raw.leadSource === "object" ? raw.leadSource : null
  const leadSource    = leadSourceObj?.name ?? (typeof raw.leadSource === "string" ? raw.leadSource : "")
  const leadSourceId  = leadSourceObj?.id ?? ""

  // attorney name: combine first + last
  const attorneyName = raw.lawyer
    ? `${raw.lawyer.firstName ?? ""} ${raw.lawyer.lastName ?? ""}`.trim()
    : ""

  // computed display name: company name if COMPANY type, else "First Last"
  const firstName = raw.firstName ?? ""
  const lastName  = raw.lastName  ?? ""
  const name = raw.leadType === "COMPANY"
    ? (raw.companyName ?? `${firstName} ${lastName}`.trim())
    : (`${firstName} ${lastName}`.trim() || raw.companyName) ?? ""

  // normalise status: currentStatus (newer endpoints) vs status (older)
  const status = raw.currentStatus ?? raw.status ?? ""

  // normalise createdAt to ISO string
  const createdAt = raw.createdAt
    ? typeof raw.createdAt === "number"
      ? new Date(raw.createdAt * 1000).toISOString()   // Unix timestamp
      : String(raw.createdAt)
    : ""

  return {
    id,
    name,
    firstName,
    lastName,
    companyName: raw.companyName ?? "",
    leadType:    (raw.leadType ?? "PERSON") as "PERSON" | "COMPANY",
    status,
    email,
    phone,
    practiceArea,
    practiceAreaId,
    leadSource,
    leadSourceId,
    attorneyName,
    attorneyId: raw.lawyer?.id ?? "",
    description: raw.description ?? "",
    createdAt,
  }
}
