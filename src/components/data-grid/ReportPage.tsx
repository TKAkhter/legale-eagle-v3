import { Box, Typography, Button } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { DataGrid } from './DataGrid'
import { useState } from 'react'
import { axiosBlob } from '@lib/api/axios'
import { downloadBlob } from '@lib/utils/downloadBlob'
import type { ColumnDef, QueryFn } from './types'

interface Props<T extends Record<string, unknown>> {
  title: string
  columns: ColumnDef<T>[]
  queryKey: unknown[]
  queryFn: QueryFn<T>
  exportUrl?: string
  exportFilename?: string
  FilterPanel?: React.ComponentType<{ onSearch:(f:Record<string,unknown>)=>void; onReset:()=>void; filters:Record<string,unknown> }>
  defaultSortBy?: string
  defaultSortDir?: 'asc'|'desc'
  description?: string
}

export function ReportPage<T extends Record<string, unknown>>({
  title, columns, queryKey, queryFn, exportUrl, exportFilename, FilterPanel, defaultSortBy, defaultSortDir, description
}: Props<T>) {
  const [exporting, setExporting] = useState(false)
  async function handleExport() {
    if (!exportUrl) return
    setExporting(true)
    try { const r = await axiosBlob.get(exportUrl); downloadBlob(r.data as Blob, exportFilename ?? 'report.xlsx') }
    catch (e) { console.error('Export failed', e) }
    finally { setExporting(false) }
  }
  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: description ? 1 : 2 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>{title}</Typography>
        {exportUrl && (
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} disabled={exporting}
            onClick={handleExport}>
            Export Excel
          </Button>
        )}
      </Box>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>{description}</Typography>}
      <DataGrid
        columns={columns} queryKey={queryKey} queryFn={queryFn}
        FilterPanel={FilterPanel} hasFilters={!!FilterPanel}
        hasExport={!!exportUrl} syncWithUrl
        defaultSortBy={defaultSortBy} defaultSortDir={defaultSortDir}
      />
    </Box>
  )
}
