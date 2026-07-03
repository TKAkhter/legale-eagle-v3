import { Chip } from '@mui/material'
interface Props { filters: Record<string, unknown>; onRemove:(key:string)=>void; onClearAll:()=>void }
export function ActiveFilterChips({ filters, onRemove, onClearAll }: Props) {
  const entries = Object.entries(filters).filter(([,v]) => v != null && v !== '')
  if (!entries.length) return null
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
      <span style={{ fontSize:12, color:'#6b7280' }}>Filters:</span>
      {entries.map(([k,v]) => <Chip key={k} size="small" label={`${k}: ${String(v)}`} onDelete={() => onRemove(k)} />)}
      <Chip size="small" label="Clear all" onClick={onClearAll} variant="outlined" color="primary" />
    </div>
  )
}
