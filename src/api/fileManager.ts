/**
 * api/fileManager.ts — file manager API wrapper.
 *
 * Static mode: uses fileTree from src/data/static.ts (in-memory, no persistence).
 * Live mode:   calls Microsoft Graph / OneDrive API.
 *
 * Key OneDrive Graph endpoints:
 *   GET  /me/drive/root/children      → list root items
 *   GET  /me/drive/items/{id}/children → list folder contents
 *   POST /me/drive/items/{id}/children → create folder
 *   PUT  /me/drive/items/{id}/content  → upload file
 *   PATCH /me/drive/items/{id}         → rename
 *   DELETE /me/drive/items/{id}        → delete
 *   GET  /me/drive/items/{id}/content  → download
 */
import { env }    from "@/config/env"
import { logger } from "@/lib/logger"
import { fileTree as staticFileTree } from "@/data/static"

export interface FileItem {
  id:       string
  name:     string
  type:     "file" | "folder"
  parentId: string | null
  size:     number | null
  modified: string
  mimeType: string | null
}

// In-memory state for static mode mutations
type FileTreeMap = Record<string, FileItem[]>
let _staticTree: FileTreeMap = JSON.parse(JSON.stringify(staticFileTree)) as FileTreeMap

export const fileManagerApi = {
  /** List contents of a folder. folderId="" = root. */
  async listFolder(folderId: string): Promise<FileItem[]> {
    const key = folderId || "/"
    if (env.USE_STATIC_DATA) {
      logger.debug("fileManagerApi", `Listing folder: ${key}`)
      return (_staticTree[key] ?? []) as FileItem[]
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    const path = folderId ? `/me/drive/items/${folderId}/children` : "/me/drive/root/children"
    const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    return (data.value ?? []).map((item: Record<string,unknown>) => ({
      id:       item.id,
      name:     item.name,
      type:     item.folder ? "folder" : "file",
      parentId: folderId || null,
      size:     (item.size as number) ?? null,
      modified: String(item.lastModifiedDateTime ?? ""),
      mimeType: (item.file as {mimeType?:string})?.mimeType ?? null,
    }))
  },

  /** Create a new folder */
  async createFolder(parentId: string, name: string): Promise<FileItem> {
    logger.info("fileManagerApi", `Creating folder: ${name} in ${parentId || "root"}`)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      const key  = parentId || "/"
      const newFolder: FileItem = {
        id: `f-${Date.now()}`, name, type: "folder",
        parentId: parentId || null, size: null,
        modified: new Date().toISOString(), mimeType: null,
      }
      _staticTree[key] = [...(_staticTree[key] ?? []), newFolder]
      _staticTree[newFolder.id] = []
      return newFolder
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    const path  = parentId ? `/me/drive/items/${parentId}/children` : "/me/drive/root/children"
    const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "rename" }),
    })
    const data = await r.json()
    return { id: data.id, name: data.name, type: "folder", parentId, size: null, modified: data.lastModifiedDateTime, mimeType: null }
  },

  /** Upload a file */
  async uploadFile(parentId: string, file: File): Promise<FileItem> {
    logger.info("fileManagerApi", `Uploading: ${file.name} (${file.size} bytes) to ${parentId || "root"}`)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 800))
      const key = parentId || "/"
      const newFile: FileItem = {
        id: `f-${Date.now()}`, name: file.name, type: "file",
        parentId: parentId || null, size: file.size,
        modified: new Date().toISOString(), mimeType: file.type,
      }
      _staticTree[key] = [...(_staticTree[key] ?? []), newFile]
      return newFile
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    // Simple upload for small files (<4MB). Large files need upload session.
    const path = parentId
      ? `/me/drive/items/${parentId}:/${encodeURIComponent(file.name)}:/content`
      : `/me/drive/root:/${encodeURIComponent(file.name)}:/content`
    const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    })
    const data = await r.json()
    return { id: data.id, name: data.name, type: "file", parentId, size: data.size, modified: data.lastModifiedDateTime, mimeType: file.type }
  },

  /** Rename a file or folder */
  async rename(itemId: string, newName: string, parentId: string): Promise<void> {
    logger.info("fileManagerApi", `Renaming ${itemId} to "${newName}"`)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      const key = parentId || "/"
      _staticTree[key] = (_staticTree[key] ?? []).map(f =>
        f.id === itemId ? { ...f, name: newName } : f
      )
      return
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    })
  },

  /** Delete a file or folder */
  async delete(itemId: string, parentId: string): Promise<void> {
    logger.info("fileManagerApi", `Deleting ${itemId}`)
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
      const key = parentId || "/"
      _staticTree[key] = (_staticTree[key] ?? []).filter(f => f.id !== itemId)
      delete _staticTree[itemId]  // also remove children map
      return
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** Get download URL for a file */
  async getDownloadUrl(itemId: string): Promise<string> {
    if (env.USE_STATIC_DATA) {
      // Return a placeholder data URL in static mode
      return "data:application/pdf;base64,JVBERi0x"
    }
    const { getOneDriveToken } = await import("@lib/auth/msal")
    const token = await getOneDriveToken()
    const r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    return data["@microsoft.graph.downloadUrl"] ?? ""
  },
}
