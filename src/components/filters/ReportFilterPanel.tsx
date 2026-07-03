import { Box, Button } from '@mui/material'
import { useState } from 'react'
import { DateRangeFilter } from './DateRangeFilter'
import { UserSelectFilter } from './UserSelectFilter'
import { ClientSelectFilter } from './ClientSelectFilter'
import { MatterSelectFilter } from './MatterSelectFilter'
import { DepartmentFilter } from './DepartmentFilter'

export interface ReportFilterConfig {
  showUser?: boolean
  showClient?: boolean
  showMatter?: boolean
  showDepartment?: boolean
  showDateRange?: boolean
}

export function makeReportFilterPanel(config: ReportFilterConfig) {
  return function ReportFilterPanel({ onSearch, onReset, filters }: { onSearch:(f:Record<string,unknown>)=>void; onReset:()=>void; filters:Record<string,unknown> }) {
    const [f, setF] = useState<Record<string,unknown>>(filters)
    const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
    return (
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, alignItems:'flex-end' }}>
        {config.showUser       && <UserSelectFilter   value={String(f.userId??'')}       onChange={v=>set('userId',v)} />}
        {config.showClient     && <ClientSelectFilter value={String(f.clientId??'')}     onChange={v=>set('clientId',v)} />}
        {config.showMatter     && <MatterSelectFilter value={String(f.matterId??'')}     onChange={v=>set('matterId',v)} />}
        {config.showDepartment && <DepartmentFilter   value={String(f.departmentId??'')} onChange={v=>set('departmentId',v)} />}
        {config.showDateRange  && <DateRangeFilter fromDate={String(f.fromDate??'')} toDate={String(f.toDate??'')} onChange={v=>setF(p=>({...p,...v}))} />}
        <Box sx={{ display:'flex', gap:1 }}>
          <Button variant="contained" size="small" onClick={()=>onSearch(f)}>Apply</Button>
          <Button size="small" onClick={()=>{setF({});onReset()}}>Reset</Button>
        </Box>
      </Box>
    )
  }
}
