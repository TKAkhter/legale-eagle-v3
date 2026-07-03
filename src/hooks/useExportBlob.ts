import { useState } from 'react'
import { axiosBlob } from '@lib/api/axios'
import { downloadBlob } from '@lib/utils/downloadBlob'

export function useExportBlob() {
  const [exporting, setExporting] = useState(false)

  async function exportFile(url: string, params: Record<string, unknown>, filename: string) {
    setExporting(true)
    try {
      const response = await axiosBlob.get(url, { params })
      downloadBlob(response.data as Blob, filename)
    } finally {
      setExporting(false)
    }
  }

  return { exportFile, exporting }
}
