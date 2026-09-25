/**
 * Build LMS-style OneDrive Tasks folder URL (mirrors OLD TaskOneDriveButton).
 * Falls back to in-app OneDrive browser when SharePoint env is not configured.
 */
import { env } from "@/config/env"

export function clientExternalIdFromTask(task: Record<string, unknown>): string {
  const clientMini = (task.clientMini ?? task.client ?? {}) as Record<string, unknown>
  const matterMini = (task.matterMini ?? task.matter ?? {}) as Record<string, unknown>
  const matterClient = (matterMini.clientMini ?? matterMini.client ?? {}) as Record<string, unknown>
  return String(
    clientMini.clientExternalId
    ?? matterClient.clientExternalId
    ?? task.clientExternalId
    ?? task.externalId
    ?? "",
  )
}

export function buildTaskFolderUrl(task: Record<string, unknown>): string | null {
  const externalId = clientExternalIdFromTask(task)
  if (!externalId) return null

  const taskType = String(task.taskType ?? task.eventType ?? "").toUpperCase()
  const taskName = String(task.taskName ?? task.title ?? "")
  const matterMini = (task.matterMini ?? task.matter ?? {}) as Record<string, unknown>
  const isSub = Boolean(matterMini.isSubMatter ?? matterMini.subMatter)
  const matterTitle = String(
    (isSub ? matterMini.parentMatterTitle : matterMini.title) ?? matterMini.title ?? "",
  )
  const clientMini = (task.clientMini ?? task.client ?? matterMini.clientMini ?? {}) as Record<string, unknown>
  const oldClient = Boolean(clientMini.oldClient ?? matterMini.oldClient ?? task.oldClient)

  if (env.ONEDRIVE_TENANT && (env.ONEDRIVE_ROOT_NEW || env.ONEDRIVE_ROOT_OLD) && taskName) {
    if (!oldClient && env.ONEDRIVE_USER_NEW && env.ONEDRIVE_ROOT_NEW) {
      if (taskType === "MATTER" && matterTitle) {
        return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_NEW}/${env.ONEDRIVE_ROOT_NEW}/${encodeURIComponent(externalId)}/Matters/${encodeURIComponent(matterTitle)}/Tasks/${encodeURIComponent(taskName)}`
      }
      return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_NEW}/${env.ONEDRIVE_ROOT_NEW}/${encodeURIComponent(externalId)}/Tasks/${encodeURIComponent(taskName)}`
    }
    if (oldClient && env.ONEDRIVE_USER_OLD && env.ONEDRIVE_ROOT_OLD) {
      if (taskType === "CLIENT") {
        return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_OLD}/${env.ONEDRIVE_ROOT_OLD}/Client Docs/${encodeURIComponent(externalId)}/Task Documents/${encodeURIComponent(taskName)}`
      }
      if (matterTitle) {
        return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_OLD}/${env.ONEDRIVE_ROOT_OLD}/${encodeURIComponent(matterTitle)}/Task Documents/${encodeURIComponent(taskName)}`
      }
    }
  }

  const matterId = String(matterMini.id ?? matterMini.matterId ?? task.matterId ?? "")
  const clientId = String(clientMini.id ?? clientMini.clientId ?? task.clientId ?? "")
  const folder = taskName ? `Tasks/${encodeURIComponent(taskName)}` : "Tasks"
  if (taskType === "CLIENT" && clientId) {
    return `/integrations/onedrive?relatedTo=CLIENT&relatedToId=${encodeURIComponent(clientId)}&folder=${folder}`
  }
  if (matterId) {
    return `/integrations/onedrive?relatedTo=MATTER&relatedToId=${encodeURIComponent(matterId)}&folder=${folder}`
  }
  if (clientId) {
    return `/integrations/onedrive?relatedTo=CLIENT&relatedToId=${encodeURIComponent(clientId)}&folder=${folder}`
  }
  return null
}
