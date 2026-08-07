/**
 * client.transformer.ts
 * BE → canonical Client shape.
 */
import { logger } from "@/lib/logger"

export interface RawClient {
  id?:          string
  clientId?:    string
  firstName?:   string
  lastName?:    string
  companyName?: string
  clientType?:  string
  emails?:      { emailId: string }[]
  email?:       string
  phones?:      { phoneNo: string; codeNo?: string }[]
  phone?:       string
  trnNo?:       string
  nationality?: string
  referral?:    boolean
  referralName?:string
  active?:      boolean
  createdAt?:   string | number
}

export interface Client {
  id:           string
  name:         string
  firstName:    string
  lastName:     string
  companyName:  string
  clientType:   "PERSON" | "COMPANY"
  email:        string
  phone:        string
  trnNo:        string
  nationality:  string
  referral:     boolean
  referralName: string
  active:       boolean
  createdAt:    string
}

export function transformClient(raw: RawClient): Client {
  const id = raw.id ?? raw.clientId ?? ""
  if (!id) logger.warn("transformClient", "Client missing id", raw)

  const firstName = raw.firstName ?? ""
  const lastName  = raw.lastName  ?? ""
  const name = raw.clientType === "COMPANY"
    ? (raw.companyName ?? `${firstName} ${lastName}`.trim())
    : (`${firstName} ${lastName}`.trim() || raw.companyName) ?? ""

  return {
    id,
    name,
    firstName,
    lastName,
    companyName: raw.companyName ?? "",
    clientType:  (raw.clientType ?? "PERSON") as "PERSON" | "COMPANY",
    email:       raw.emails?.[0]?.emailId ?? raw.email ?? "",
    phone:       raw.phones?.[0]?.phoneNo ?? raw.phone ?? "",
    trnNo:       raw.trnNo ?? "",
    nationality: raw.nationality ?? "",
    referral:    raw.referral ?? false,
    referralName:raw.referralName ?? "",
    active:      raw.active ?? true,
    createdAt:   raw.createdAt ? String(raw.createdAt) : "",
  }
}
