import { axiosClient } from '@lib/api/axios'

/**
 * Register an OneDrive folder for a newly created entity.
 * Called after Lead/Client/Matter creation. Best-effort — never throws.
 * POST /api/onedrive/folder/register
 * Body: { entityId, entityName, folderType: 'Leads'|'Client'|'Matter' }
 */
export async function registerOneDriveFolder(
  entityId: string,
  entityName: string,
  folderType: 'Leads' | 'Client' | 'Matter'
): Promise<void> {
  try {
    await axiosClient.post('/api/onedrive/folder/register', { entityId, entityName, folderType })
  } catch {
    // Best-effort: OneDrive integration is optional — never block the main flow
    console.warn('[OneDrive] Failed to register folder for', folderType, entityId)
  }
}
