/**
 * Outlook calendar helpers — Graph /me/events via MSAL (same pattern as emailApi/fileManager).
 * Ports LMS buildOutlookEvent + createOutlookEvent without copying OLD module structure.
 */
import { getCalendarToken } from "@lib/auth/msal"

const APP_TIMEZONE = "Asia/Dubai"

export interface OutlookPerson {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  fullName?: string
}

export interface OutlookLocation {
  id?: string
  name?: string
}

export interface HearingForOutlook {
  hearingDate?: string | null
  hearingTime?: string | null
  nextHearingDate?: string | null
  caseNo?: string | null
  caseYear?: string | null
  caseType?: string | null
  caseTypeId?: string | null
  chamberNo?: string | null
  clientName?: string | null
  matterName?: string | null
  matterTitle?: string | null
  matter?: { title?: string } | null
  attorney?: string | OutlookPerson | null
  attorneyId?: string | null
  attorneyName?: string | null
  attendedAttorney?: string | OutlookPerson | null
  attendedAttorneyId?: string | null
  attendedAttorneyName?: string | null
  hearingLocation?: string | OutlookLocation | null
  location?: string | OutlookLocation | null
  summary?: string | null
  description?: string | null
  note?: string | null
  instruction?: string | null
  prvSummary?: string | null
  decisionSummary?: string | null
}

function getId(val: unknown): string | null {
  if (!val) return null
  if (typeof val === "string") return val
  if (typeof val === "object") {
    const o = val as { id?: string; _id?: string }
    return o.id || o._id || null
  }
  return null
}

function cleanValue(v: unknown): string | null {
  if (v === "-" || v === "" || v === null || v === undefined) return null
  return String(v)
}

function getUser(val: unknown, attorneys: OutlookPerson[]): OutlookPerson | null {
  if (!val) return null
  if (typeof val === "object" && (val as OutlookPerson).email) return val as OutlookPerson
  const id = getId(val)
  if (!id) return null
  return attorneys.find(a => a.id === id) ?? null
}

function getLocation(val: unknown, locations: OutlookLocation[]): OutlookLocation | null {
  if (!val) return null
  if (typeof val === "object" && (val as OutlookLocation).name) return val as OutlookLocation
  const id = getId(val)
  if (!id) return null
  return locations.find(l => l.id === id) ?? null
}

function buildStartEnd(hearingDate: string, hearingTime: string) {
  // Parse as local Dubai wall-clock; Graph receives dateTime + timeZone.
  const datePart = hearingDate.slice(0, 10)
  const timePart = (hearingTime.length === 5 ? hearingTime : hearingTime.slice(0, 5)) || "09:00"
  const startMs = Date.parse(`${datePart}T${timePart}:00+04:00`)
  if (Number.isNaN(startMs)) throw new Error("Invalid hearing date/time")
  const endMs = startMs + 60 * 60 * 1000
  const fmt = (ms: number) => {
    const d = new Date(ms)
    // Format in Asia/Dubai via offset already applied above
    const pad = (n: number) => String(n).padStart(2, "0")
    // Use UTC getters after constructing with +04:00 — convert via Intl
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(d)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00"
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
  }
  return { start: fmt(startMs), end: fmt(endMs) }
}

function tableRow(label: string, value: string | null | undefined) {
  return `<tr>
  <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${label}</td>
  <td style="padding:8px;border:1px solid #ddd;">${value || "-"}</td>
</tr>`
}

function personLabel(p: OutlookPerson | null | undefined, fallback?: string | null) {
  if (p) {
    return p.fullName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || fallback || null
  }
  return fallback || null
}

/** Build a Graph calendar event payload from hearing data. */
export function buildOutlookEvent(
  data: HearingForOutlook,
  attorneys: OutlookPerson[] = [],
  locations: OutlookLocation[] = [],
): Record<string, unknown> {
  const hearingDate = cleanValue(data.hearingDate)?.slice(0, 10)
  const hearingTime = cleanValue(data.hearingTime) ?? "09:00"
  if (!hearingDate) throw new Error("Hearing date is required for Outlook")

  const responsible = getUser(data.attorneyId || data.attorney, attorneys)
  const attended = getUser(data.attendedAttorneyId || data.attendedAttorney, attorneys)
  const location = getLocation(data.hearingLocation ?? data.location, locations)
  const { start, end } = buildStartEnd(hearingDate, hearingTime)

  const caseType = cleanValue(data.caseType) || cleanValue(data.caseTypeId)
  const matterName = cleanValue(data.matterName) || cleanValue(data.matterTitle) || cleanValue(data.matter?.title)
  const clientName = cleanValue(data.clientName)
  const caseNo = cleanValue(data.caseNo)
  const caseYear = cleanValue(data.caseYear)
  const locName = location?.name
    || (typeof data.hearingLocation === "object" ? data.hearingLocation?.name : null)
    || (typeof data.location === "string" ? data.location : null)
    || "Court"

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
      <div style="background:#1976d2;color:white;padding:18px 24px;border-radius:10px 10px 0 0;font-size:22px;font-weight:600;">
        Hearing Calendar Event
      </div>
      <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;overflow:hidden;">
        <div style="padding:18px 24px;border-bottom:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-size:15px;">
          <strong>Case:</strong> ${caseNo || "-"}/${caseYear || "-"}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Client:</strong> ${clientName || "-"}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Matter:</strong> ${matterName || "-"}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${tableRow("Hearing Date", hearingDate)}
          ${tableRow("Hearing Time", hearingTime)}
          ${tableRow("Next Hearing Date", cleanValue(data.nextHearingDate))}
          ${tableRow("Previous Decision", cleanValue(data.prvSummary) || cleanValue(data.decisionSummary))}
          ${tableRow("Summary", cleanValue(data.summary))}
          ${tableRow("Hearing Instruction", cleanValue(data.description) || cleanValue(data.instruction))}
          ${tableRow("Case Type", caseType)}
          ${tableRow("Case No", caseNo)}
          ${tableRow("Case Year", caseYear)}
          ${tableRow("Chamber No", cleanValue(data.chamberNo))}
          ${tableRow("Client", clientName)}
          ${tableRow("Matter", matterName)}
          ${tableRow("Attorney", personLabel(responsible, data.attorneyName))}
          ${tableRow("Attended Attorney", personLabel(attended, data.attendedAttorneyName))}
          ${tableRow("Hearing Location", locName)}
          ${tableRow("Hearing Note", cleanValue(data.note))}
        </table>
      </div>
    </div>`

  const attendees: Record<string, unknown>[] = []
  if (responsible?.email) {
    attendees.push({
      emailAddress: {
        address: responsible.email,
        name: personLabel(responsible) || responsible.email,
      },
      type: "required",
    })
  }
  if (attended?.email) {
    attendees.push({
      emailAddress: {
        address: attended.email,
        name: personLabel(attended) || attended.email,
      },
      type: "required",
    })
  }

  return {
    subject: `Hearing - Case ${caseNo || "-"}/${caseYear || "-"}`,
    body: { contentType: "HTML", content: html },
    start: { dateTime: start, timeZone: APP_TIMEZONE },
    end: { dateTime: end, timeZone: APP_TIMEZONE },
    location: { displayName: locName },
    attendees,
    isOnlineMeeting: false,
  }
}

/** POST Graph /me/events — returns created event (includes id). */
export async function createOutlookEvent(eventPayload: Record<string, unknown>): Promise<{ id: string }> {
  const token = await getCalendarToken()
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventPayload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw err
  }
  return res.json() as Promise<{ id: string }>
}

/** Persist Graph meeting id on the hearing (LMS PUT /hearing/update/meeting). */
export async function linkHearingMeeting(hearingId: string, meetingId: string): Promise<void> {
  const { axiosClient } = await import("@lib/api/axios")
  await axiosClient.put("/api/hearing/update/meeting", null, {
    params: { hearingId, meetingId },
  })
}

/** Full flow: build event → create in Outlook → link meeting id. */
export async function saveHearingToOutlook(
  hearing: HearingForOutlook & { id?: string; hearingId?: string; meetingId?: string },
  attorneys: OutlookPerson[] = [],
  locations: OutlookLocation[] = [],
): Promise<string> {
  if (hearing.meetingId) throw new Error("Hearing already added in Outlook Calendar")
  const event = buildOutlookEvent(hearing, attorneys, locations)
  const created = await createOutlookEvent(event)
  const hearingId = String(hearing.hearingId || hearing.id || "")
  if (!hearingId) throw new Error("Missing hearing id")
  await linkHearingMeeting(hearingId, created.id)
  return created.id
}
