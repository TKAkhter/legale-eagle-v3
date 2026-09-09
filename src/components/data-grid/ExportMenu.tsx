/**
 * ExportMenu.tsx — export format picker for DataGrid toolbar.
 *
 * Shows a dropdown with CSV, PDF, and Excel (server) options.
 * CSV and PDF are client-side. Excel calls the exportFn prop.
 *
 * Usage:
 *   <ExportMenu rows={rows} columns={columns} exportFn={exportFn} params={gridParams} />
 */
import { useState } from 'react'
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import FileDownloadIcon  from '@mui/icons-material/FileDownload'
import TableViewIcon     from '@mui/icons-material/TableView'
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf'
import ArticleIcon       from '@mui/icons-material/Article'
import { exportToCSV, exportToPDF } from '@lib/utils/exportUtils'
import { downloadBlob } from '@lib/utils/downloadBlob'
import { toast } from '@/lib/toast'
import type { ExportFn } from './types'
import type { GridParams } from '@/types/common.types'

interface Props {
  rows:        Record<string, unknown>[]
  columns:     { field: string; header: string }[]
  exportFn?:   ExportFn
  params:      GridParams
  filename?:   string
  title?:      string
  disabled?:   boolean
}

export function ExportMenu({ rows, columns, exportFn, params, filename = 'export', title = 'Export', disabled }: Props) {
  const [anchor,    setAnchor]    = useState<HTMLElement|null>(null)
  const [exporting, setExporting] = useState<'csv'|'pdf'|'excel'|null>(null)

  async function handleExcel() {
    if (!exportFn) return
    setExporting('excel'); setAnchor(null)
    try {
      const blob = await exportFn(params)
      downloadBlob(blob, `${filename}.xlsx`)
      toast.success('Excel file downloaded')
    } catch { toast.error('Export failed') }
    finally { setExporting(null) }
  }

  function handleCSV() {
    setAnchor(null); setExporting('csv')
    try { exportToCSV(rows, columns, `${filename}.csv`); toast.success('CSV downloaded') }
    catch { toast.error('CSV export failed') }
    finally { setExporting(null) }
  }

  function handlePDF() {
    setAnchor(null); setExporting('pdf')
    try { exportToPDF(rows, columns, title, filename); toast.info('Print dialog opened — choose "Save as PDF"') }
    catch { toast.error('PDF export failed') }
    finally { setExporting(null) }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={disabled || !!exporting}
        startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon />}
        onClick={e => setAnchor(e.currentTarget)}
        sx={{ fontSize: 12 }}
      >
        Export
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 160, borderRadius: 1.5 } } }}>
        <MenuItem onClick={handleCSV} dense>
          <ListItemIcon><TableViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePDF} dense>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Save as PDF</ListItemText>
        </MenuItem>
        {exportFn && (
          <MenuItem onClick={handleExcel} dense>
            <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Download Excel</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
