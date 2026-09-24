import { Box, Autocomplete, TextField } from '@mui/material'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DateRangeFilter } from './DateRangeFilter'
import { UserSelectFilter } from './UserSelectFilter'
import { ClientSelectFilter } from './ClientSelectFilter'
import { MatterSelectFilter } from './MatterSelectFilter'
import { DepartmentFilter } from './DepartmentFilter'
import { FilterActions } from './FilterActions'
import { leadsApi } from '@/api/leads'
import { adminApi } from '@/api/admin'

export interface ReportFilterConfig {
  showUser?: boolean
  showClient?: boolean
  showMatter?: boolean
  showDepartment?: boolean
  showDateRange?: boolean
  showStage?: boolean
  showLeadSource?: boolean
}

/** Shared report filters — Search/Clear only trigger the list API. */
export function makeReportFilterPanel(config: ReportFilterConfig) {
  return function ReportFilterPanel({ onSearch, onReset, filters }: { onSearch:(f:Record<string,unknown>)=>void; onReset:()=>void; filters:Record<string,unknown> }) {
    const [f, setF] = useState<Record<string,unknown>>(filters)
    const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

    const stagesQ = useQuery({
      queryKey: ["lead-statuses"],
      queryFn: () => leadsApi.getLeadStatuses(),
      enabled: Boolean(config.showStage),
      staleTime: 60_000,
    })
    const sourcesQ = useQuery({
      queryKey: ["leadSources"],
      queryFn: () => adminApi.getLeadSources(),
      enabled: Boolean(config.showLeadSource),
      staleTime: 60_000,
    })

    const stageOpts = [
      ...(stagesQ.data ?? []),
      "Converted",
    ].filter((v, i, a) => a.indexOf(v) === i)

    // LMS pending-matter filter sends source **name** (sourceName), not id.
    const sourceOpts = ((sourcesQ.data ?? []) as { id?: string; name?: string; sourceName?: string }[]).map(s => ({
      id: String(s.id ?? ""),
      name: String(s.sourceName ?? s.name ?? s.id ?? ""),
    })).filter((s: { id: string; name: string }) => s.name)

    return (
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1.5, alignItems:'flex-end' }}>
        {config.showUser       && <UserSelectFilter   value={String(f.userId??'')}       onChange={v=>set('userId',v)} />}
        {config.showClient     && <ClientSelectFilter value={String(f.clientId??'')}     onChange={v=>set('clientId',v)} />}
        {config.showMatter     && <MatterSelectFilter value={String(f.matterId??'')}     onChange={v=>set('matterId',v)} />}
        {config.showDepartment && <DepartmentFilter   value={String(f.departmentId??'')} onChange={v=>set('departmentId',v)} />}
        {config.showStage && (
          <Autocomplete
            size="small"
            sx={{ minWidth: 160 }}
            options={stageOpts}
            value={String(f.stage ?? "") || null}
            onChange={(_, v) => set('stage', v ?? '')}
            renderInput={params => <TextField {...params} label="Stage" />}
          />
        )}
        {config.showLeadSource && (
          <Autocomplete
            size="small"
            sx={{ minWidth: 180 }}
            options={sourceOpts}
            getOptionLabel={o => o.name}
            isOptionEqualToValue={(a, b) => a.name === b.name}
            value={sourceOpts.find(s => s.name === String(f.leadSource ?? '')) ?? null}
            onChange={(_, v) => set('leadSource', v?.name ?? '')}
            renderInput={params => <TextField {...params} label="Lead Source" />}
          />
        )}
        {config.showDateRange  && <DateRangeFilter fromDate={String(f.fromDate??'')} toDate={String(f.toDate??'')} onChange={v=>setF(p=>({...p,...v}))} />}
        <FilterActions
          onSearch={() => onSearch(f)}
          onClear={() => { setF({}); onReset() }}
          searchLabel="Search"
        />
      </Box>
    )
  }
}
