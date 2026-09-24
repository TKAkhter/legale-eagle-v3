/**
 * Build LMS-style OneDrive Disbursements folder URL for an expense activity row.
 * Falls back to in-app OneDrive browser when SharePoint env is not configured.
 */
import { env } from "@/config/env"

export function buildDisbursementFolderUrl(row: Record<string, unknown>): string | null {
  const activityId = String(row.activityId ?? row.id ?? "")
  const matterMini = (row.matterMini ?? row.matter ?? {}) as Record<string, unknown>
  const isSub = Boolean(matterMini.subMatter ?? matterMini.isSubMatter)
  const matterTitle = String(
    (isSub ? matterMini.parentMatterTitle : matterMini.title) ?? matterMini.title ?? "",
  )
  const client = (row.client ?? row.clientMini ?? {}) as Record<string, unknown>
  const clientExternalId = String(client.clientExternalId ?? "")
  const oldClient = Boolean(client.oldClient)

  if (env.ONEDRIVE_TENANT && (env.ONEDRIVE_ROOT_NEW || env.ONEDRIVE_ROOT_OLD) && matterTitle) {
    if (oldClient && env.ONEDRIVE_USER_OLD && env.ONEDRIVE_ROOT_OLD) {
      return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_OLD}/${env.ONEDRIVE_ROOT_OLD}/${encodeURIComponent(matterTitle)}/Disbursements/${activityId}`
    }
    if (env.ONEDRIVE_USER_NEW && env.ONEDRIVE_ROOT_NEW && clientExternalId) {
      return `https://${env.ONEDRIVE_TENANT}/personal/${env.ONEDRIVE_USER_NEW}/${env.ONEDRIVE_ROOT_NEW}/${encodeURIComponent(clientExternalId)}/Matters/${encodeURIComponent(matterTitle)}/Disbursements/${activityId}`
    }
  }

  // In-app OneDrive scoped to matter when possible
  const matterId = String(matterMini.id ?? matterMini.matterId ?? row.matterId ?? "")
  if (matterId) {
    return `/integrations/onedrive?relatedTo=MATTER&relatedToId=${encodeURIComponent(matterId)}&folder=Disbursements/${encodeURIComponent(activityId)}`
  }
  return activityId
    ? `/integrations/onedrive?folder=Disbursements/${encodeURIComponent(activityId)}`
    : null
}
