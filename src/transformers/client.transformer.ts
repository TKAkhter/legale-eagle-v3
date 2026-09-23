/**
 * client.transformer.ts
 * BE → canonical Client shape for list + detail.
 */
import { logger } from "@/lib/logger"

export interface RawContactEmail {
  emailId?: string
  primary?: boolean
  type?: string
}

export interface RawContactPhone {
  phoneNo?: string
  codeNo?: string
  primary?: boolean
  type?: string
}

export interface RawAddress {
  street?: string
  city?: string
  state?: string
  country?: string
}

export interface RawClient {
  id?: string
  clientId?: string
  clientExternalId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  prefix?: string
  companyName?: string
  clientType?: string
  emails?: RawContactEmail[]
  email?: RawContactEmail[] | string
  phones?: RawContactPhone[]
  phone?: string
  address?: RawAddress[] | string
  nationality?: string[] | string
  trnNo?: string
  status?: string
  active?: boolean
  lfaCount?: number
  openMatter?: number
  closeMatter?: number
  closedMatter?: number
  favourite?: boolean
  isFav?: boolean
  lastActivityDate?: string
  username?: string
  groupName?: string
  bankAccount?: string | { accountName?: string; accountNumber?: string; bankName?: string }
  zohoClientId?: string
  createdAt?: string | number
  representativeInfo?: { name?: string; role?: string }[]
  totalInvoiceAmount?: number
}

export interface Client {
  id: string
  clientId: string
  clientExternalId: string
  name: string
  firstName: string
  middleName: string
  lastName: string
  prefix: string
  companyName: string
  clientType: "PERSON" | "COMPANY"
  email: string
  emails: string[]
  phone: string
  phones: string[]
  address: string
  nationality: string[]
  trnNo: string
  status: string
  active: boolean
  lfaCount: number
  openMatter: number
  closeMatter: number
  favourite: boolean
  lastActivityDate: string
  username: string
  groupName: string
  bankAccount: string
  zohoClientId: string
  createdAt: string
  totalInvoiceAmount: number
}

function emailsFrom(raw: RawClient): string[] {
  // Old LMS detail uses `email` (array of {emailId, primary}); mini list may use `emails`.
  const list = Array.isArray(raw.emails)
    ? raw.emails
    : Array.isArray(raw.email)
      ? raw.email
      : []
  if (list.length) {
    const sorted = [...list].sort((a, b) => Number(!!b.primary) - Number(!!a.primary))
    return sorted
      .map(item => {
        const email = item.emailId ?? ""
        return item.primary ? `${email} (primary)` : email
      })
      .filter(Boolean)
  }
  return typeof raw.email === "string" && raw.email ? [raw.email] : []
}

function phonesFrom(raw: RawClient): string[] {
  if (Array.isArray(raw.phones) && raw.phones.length) {
    const sorted = [...raw.phones].sort((a, b) => Number(!!b.primary) - Number(!!a.primary))
    return sorted
      .map(item => {
        const code = String(item.codeNo ?? "").trim()
        const match = code.match(/\+?\d{1,4}/)
        const prefix = match ? (match[0].startsWith("+") ? match[0] : `+${match[0]}`) : ""
        const phone = `${prefix ? `${prefix} ` : ""}${item.phoneNo ?? ""}`.trim()
        return item.primary ? `${phone} (primary)` : phone
      })
      .filter(Boolean)
  }
  return raw.phone ? [raw.phone] : []
}

function addressFrom(raw: RawClient): string {
  if (typeof raw.address === "string") return raw.address
  const first = Array.isArray(raw.address) ? raw.address[0] as RawAddress & { zip?: string } : null
  if (!first) return ""
  return [first.street, first.city, first.state, (first as { zip?: string }).zip, first.country].filter(Boolean).join(", ")
}

function nationalityFrom(raw: RawClient): string[] {
  if (Array.isArray(raw.nationality)) return raw.nationality.filter(Boolean)
  return raw.nationality ? [raw.nationality] : []
}

function bankAccountFrom(raw: RawClient): string {
  if (!raw.bankAccount) return ""
  if (typeof raw.bankAccount === "string") return raw.bankAccount
  const b = raw.bankAccount as { accountName?: string; accountNumber?: string; bankName?: string }
  return [b.accountName, b.accountNumber, b.bankName].filter(Boolean).join(" · ")
}

export function transformClient(raw: RawClient): Client {
  const id = raw.id ?? raw.clientId ?? ""
  if (!id) logger.warn("transformClient", "Client missing id", raw)

  const firstName = raw.firstName ?? ""
  const middleName = raw.middleName ?? ""
  const lastName = raw.lastName ?? ""
  const prefix = raw.prefix ?? ""
  const companyName = raw.companyName ?? ""
  const clientType = (raw.clientType ?? "PERSON") as "PERSON" | "COMPANY"
  const personName = [prefix, firstName, middleName, lastName].filter(Boolean).join(" ").trim()
  const name = clientType === "COMPANY" ? (companyName || personName) : (personName || companyName)
  const status = raw.status ?? (raw.active === false ? "CLOSE" : "OPEN")
  const emails = emailsFrom(raw)
  const phones = phonesFrom(raw)

  return {
    id,
    clientId: raw.clientId ?? id,
    clientExternalId: raw.clientExternalId ?? "",
    name,
    firstName,
    middleName,
    lastName,
    prefix,
    companyName,
    clientType,
    email: emails[0]?.replace(" (primary)", "") ?? "",
    emails,
    phone: phones[0]?.replace(" (primary)", "") ?? "",
    phones,
    address: addressFrom(raw),
    nationality: nationalityFrom(raw),
    trnNo: raw.trnNo ?? "",
    status,
    active: status !== "CLOSE",
    lfaCount: Number(raw.lfaCount ?? 0),
    openMatter: Number(raw.openMatter ?? 0),
    closeMatter: Number(raw.closeMatter ?? raw.closedMatter ?? 0),
    favourite: Boolean(raw.favourite ?? raw.isFav),
    lastActivityDate: raw.lastActivityDate ?? "",
    username: raw.username ?? "",
    groupName: raw.groupName ?? "",
    bankAccount: bankAccountFrom(raw),
    zohoClientId: raw.zohoClientId ?? "",
    createdAt: raw.createdAt ? String(raw.createdAt) : "",
    totalInvoiceAmount: Number(raw.totalInvoiceAmount ?? 0),
  }
}
