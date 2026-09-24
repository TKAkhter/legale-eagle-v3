/**
 * api/email.ts — email API wrapper.
 *
 * In static mode: returns data from src/data/static.ts (emailFolders, emails).
 * In live mode: calls Microsoft Graph API via the OneDrive/MSAL token.
 *
 * Microsoft Graph email endpoints:
 *   GET  /me/mailFolders         → list folders
 *   GET  /me/messages?$filter=   → list messages
 *   GET  /me/messages/{id}       → get one message
 *   POST /me/sendMail            → send email
 *   DELETE /me/messages/{id}     → delete
 *   PATCH /me/messages/{id}      → mark read, move, etc.
 */
import { env }    from "@/config/env"
import { logger } from "@/lib/logger"
import { emailFolders as staticFolders, emails as staticEmails } from "@/data/static"

export interface EmailFolder {
  id:     string
  label:  string
  icon:   string
  unread: number
}

export interface Email {
  id:             string
  folderId:       string
  from:           string
  to:             string
  subject:        string
  preview:        string
  body:           string
  date:           string
  read:           boolean
  starred:        boolean
  hasAttachments: boolean
}

export interface SendEmailPayload {
  to:      string[]
  subject: string
  body:    string
}

export const emailApi = {
  /** List all mail folders */
  async getFolders(): Promise<EmailFolder[]> {
    if (env.USE_STATIC_DATA) {
      logger.debug("emailApi", "Using static email folders")
      return staticFolders as EmailFolder[]
    }
    // Real: GET https://graph.microsoft.com/v1.0/me/mailFolders
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    const r = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    return (data.value ?? []).map((f: Record<string,unknown>) => ({
      id: f.id, label: f.displayName, icon: "Folder", unread: f.unreadItemCount ?? 0,
    }))
  },

  /** List emails in a folder */
  async getEmails(folderId: string): Promise<Email[]> {
    if (env.USE_STATIC_DATA) {
      logger.debug("emailApi", `Static emails for folder: ${folderId}`)
      return (staticEmails as Email[]).filter(e => e.folderId === folderId)
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    const folderPath = folderId === "inbox" ? "inbox" : `mailFolders/${folderId}`
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/me/${folderPath}/messages?$top=50&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await r.json()
    return (data.value ?? []).map((m: Record<string,unknown>) => ({
      id:    m.id, folderId,
      from:  (m.from as {emailAddress?:{name?:string;address?:string}})?.emailAddress?.address ?? "",
      to:    ((m.toRecipients as {emailAddress:{address:string}}[]) ?? [])[0]?.emailAddress?.address ?? "",
      subject: String(m.subject ?? "(No subject)"),
      preview: String(m.bodyPreview ?? ""),
      body:    (m.body as {content?:string})?.content ?? "",
      date:    String(m.receivedDateTime ?? ""),
      read:    Boolean(m.isRead),
      starred: Boolean((m.flag as {flagStatus?:string})?.flagStatus === "flagged"),
      hasAttachments: Boolean(m.hasAttachments),
    }))
  },

  /** Mark an email as read */
  async markRead(emailId: string): Promise<void> {
    if (env.USE_STATIC_DATA) return
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    })
  },

  /** Delete (move to trash) */
  async delete(emailId: string): Promise<void> {
    if (env.USE_STATIC_DATA) { await new Promise(r => setTimeout(r, 300)); return }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** Send an email */
  async send(payload: SendEmailPayload): Promise<void> {
    if (env.USE_STATIC_DATA) {
      logger.info("emailApi", "Static mode — email send simulated", payload)
      await new Promise(r => setTimeout(r, 500))
      return
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject: payload.subject,
          body: { contentType: "Text", content: payload.body },
          toRecipients: payload.to.map(a => ({ emailAddress: { address: a } })),
        },
      }),
    })
  },

  /**
   * Resolve a conversation thread by internetMessageId (LMS matter-mail detail).
   * Returns messages newest-first; empty if Graph unavailable.
   */
  async getConversationByInternetMessageId(internetMessageId: string): Promise<Array<{
    id: string
    subject: string
    from: string
    to: string
    cc: string
    body: string
    date: string
    webLink: string
    hasAttachments: boolean
  }>> {
    if (env.USE_STATIC_DATA || !internetMessageId) return []
    try {
      const { getOneDriveToken } = await import("@lib/auth/msal")
      const token = await getOneDriveToken()
      const escaped = internetMessageId.replace(/'/g, "''")
      const filterUrl =
        `https://graph.microsoft.com/v1.0/me/messages?$filter=internetMessageId eq '${encodeURIComponent(escaped)}'` +
        `&$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,sentDateTime,internetMessageId,conversationId,hasAttachments,webLink`
      const r = await fetch(filterUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return []
      const data = await r.json()
      const first = (data.value ?? [])[0] as Record<string, unknown> | undefined
      if (!first) return []
      const conversationId = String(first.conversationId ?? "")
      let messages = data.value ?? [first]
      if (conversationId) {
        const convEsc = conversationId.replace(/'/g, "''")
        const convUrl =
          `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${encodeURIComponent(convEsc)}'` +
          `&$top=100&$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,sentDateTime,internetMessageId,conversationId,hasAttachments,webLink`
        const cr = await fetch(convUrl, { headers: { Authorization: `Bearer ${token}` } })
        if (cr.ok) {
          const cd = await cr.json()
          messages = cd.value ?? messages
        }
      }
      const addr = (list: unknown) =>
        ((list as { emailAddress?: { address?: string } }[]) ?? [])
          .map(x => x.emailAddress?.address ?? "")
          .filter(Boolean)
          .join(", ")
      return (messages as Record<string, unknown>[]).map(m => ({
        id: String(m.id ?? ""),
        subject: String(m.subject ?? "(No subject)"),
        from: (m.from as { emailAddress?: { address?: string } })?.emailAddress?.address ?? "",
        to: addr(m.toRecipients),
        cc: addr(m.ccRecipients),
        body: (m.body as { content?: string })?.content ?? "",
        date: String(m.receivedDateTime ?? m.sentDateTime ?? ""),
        webLink: String(m.webLink ?? ""),
        hasAttachments: Boolean(m.hasAttachments),
      }))
    } catch (e) {
      logger.warn("emailApi", "Graph conversation fetch failed", e)
      return []
    }
  },
}
