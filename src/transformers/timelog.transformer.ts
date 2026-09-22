/**
 * timelog.transformer.ts — normalises time log entry data.
 *
 * Flow: timelogsApi.getAll() → raw BE response → transformTimelog() → DataGrid
 */

export interface TimelogEntry {
  id:               string
  activity:         string
  description?:     string
  billingType:      string
  totalHours:       number
  billing:          number
  revenueStatus:    string
  entryDate:        string
  matter:           { id: string; title: string; matterId?: string } | null
  responsiblePerson:{ id: string; name: string }  | null
  client:           { id: string; name: string }  | null
  billable:         boolean
}

export function transformTimelog(raw: Record<string,unknown>): TimelogEntry {
  const person  = raw.responsiblePerson as Record<string,unknown> | null
  const matter  = raw.matter            as Record<string,unknown> | null
  const client  = raw.client            as Record<string,unknown> | null

  return {
    id:            String(raw.id           ?? ""),
    activity:      String(raw.activity     ?? raw.activityType ?? ""),
    description:   raw.description ? String(raw.description) : undefined,
    billingType:   String(raw.billingType  ?? "Hourly"),
    totalHours:    Number(raw.totalHours   ?? raw.hours ?? 0),
    billing:       Number(raw.billing      ?? raw.amount ?? 0),
    revenueStatus: String(raw.revenueStatus ?? "DRAFT"),
    entryDate:     String(raw.entryDate    ?? raw.createdAt ?? ""),
    matter: matter ? {
      id:       String(matter.id       ?? matter.matterId ?? ""),
      title:    String(matter.title    ?? ""),
      matterId: String(matter.matterId ?? matter.id       ?? ""),
    } : null,
    responsiblePerson: person ? {
      id:   String(person.id ?? ""),
      name: `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(),
    } : null,
    client: client ? {
      id:   String(client.id ?? ""),
      name: String(client.companyName ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()),
    } : null,
    billable: Boolean(raw.billable ?? raw.isBillable ?? true),
  }
}

export function transformTimelogPage(raw: Record<string,unknown>[]): TimelogEntry[] {
  return raw.map(transformTimelog)
}
