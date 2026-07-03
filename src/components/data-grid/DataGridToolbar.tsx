import { IconButton, Tooltip, CircularProgress, Badge, Button } from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { BulkAction } from './types'

interface Props<T> { hasExport?:boolean; hasFilters?:boolean; filterOpen?:boolean; activeFilterCount?:number; exporting?:boolean; selected?:T[]; bulkActions?:BulkAction<T>[]; onToggleFilter?:()=>void; onExport?:()=>void; onRefresh?:()=>void }
export function DataGridToolbar<T>({ hasExport, hasFilters, filterOpen, activeFilterCount=0, exporting, selected=[], bulkActions, onToggleFilter, onExport, onRefresh }: Props<T>) {
  if (!hasExport && !hasFilters && !bulkActions?.length) return null
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, gap:8 }}>
      <div style={{ display:'flex', gap:8 }}>
        {selected.length > 0 && bulkActions?.map((a,i) => <Button key={i} size="small" variant="outlined" startIcon={a.icon as React.ReactNode} onClick={() => a.onClick(selected)}>{a.label} ({selected.length})</Button>)}
      </div>
      <div style={{ display:'flex', gap:4 }}>
        {hasFilters && <Tooltip title="Filters"><IconButton size="small" onClick={onToggleFilter} color={filterOpen?'primary':'default'}><Badge badgeContent={activeFilterCount} color="primary"><FilterListIcon fontSize="small"/></Badge></IconButton></Tooltip>}
        {hasExport && <Tooltip title="Export"><IconButton size="small" onClick={onExport} disabled={exporting}>{exporting?<CircularProgress size={16}/>:<FileDownloadIcon fontSize="small"/>}</IconButton></Tooltip>}
        <Tooltip title="Refresh"><IconButton size="small" onClick={onRefresh}><RefreshIcon fontSize="small"/></IconButton></Tooltip>
      </div>
    </div>
  )
}
