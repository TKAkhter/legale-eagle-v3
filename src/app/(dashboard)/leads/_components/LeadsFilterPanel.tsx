import { useState } from 'react'
import { Button } from '@mui/material'
import { SearchInput } from '@components/filters/SearchInput'
import { DateRangeFilter } from '@components/filters/DateRangeFilter'
import { UserSelectFilter } from '@components/filters/UserSelectFilter'
import { DepartmentFilter } from '@components/filters/DepartmentFilter'
import type { FilterPanelProps } from '@components/data-grid/types'

export function LeadsFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <SearchInput value={String(f.firstName ?? '')} onChange={v => set('firstName', v)} placeholder="Search name..." />
      <UserSelectFilter value={String(f.lawyer ?? '')} onChange={v => set('lawyer', v)} label="Attorney" />
      <DepartmentFilter value={String(f.department ?? '')} onChange={v => set('department', v)} />
      <DateRangeFilter fromDate={String(f.fromDate ?? '')} toDate={String(f.toDate ?? '')} onChange={v => setF(p => ({ ...p, ...v }))} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
        <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
      </div>
    </div>
  )
}
