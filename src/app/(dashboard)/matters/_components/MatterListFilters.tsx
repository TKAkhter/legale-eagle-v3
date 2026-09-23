/**
 * Matter list filters — draft local state; Search / Clear / Email Excel hit the API.
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Autocomplete, Box, TextField } from "@mui/material"
import type { FilterPanelProps } from "@components/data-grid/types"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { matters as staticMatters } from "@/data/static"
import { DEFAULT_MATTER_STATUSES } from "@/api/matters"
import { toast } from "@/lib/toast"
import { mattersApi } from "@/api/matters"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import {
  ClientSelectFilter,
  UserSelectFilter,
  PracticeAreaFilter,
  StatusMultiFilter,
  MATTER_STATUS_OPTIONS,
  FilterActions,
} from "@components/filters"

interface Named { id: string; label: string }

export function MatterListFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [clientId, setClientId] = useState(String(filters.clientId ?? ""))
  const [attorneyIds, setAttorneyIds] = useState<string[]>(
    Array.isArray(filters.attorneyIds) ? filters.attorneyIds.map(String) : [],
  )
  const [practiceArea, setPracticeArea] = useState(String(filters.practiceArea ?? ""))
  const [matterId, setMatterId] = useState(String(filters.matterId ?? ""))
  const [procuredByIds, setProcuredByIds] = useState<string[]>(
    Array.isArray(filters.procuredByIds) ? filters.procuredByIds.map(String) : [],
  )
  const [status, setStatus] = useState<string[]>(
    Array.isArray(filters.status) && filters.status.length
      ? filters.status.map(String)
      : DEFAULT_MATTER_STATUSES,
  )
  const [scope, setScope] = useState(String(filters.scope ?? ""))
  const [partyOpposing, setPartyOpposing] = useState(String(filters.partyOpposing ?? ""))
  const [emailing, setEmailing] = useState(false)

  const mattersQuery = useQuery({
    queryKey: ["lookups", "matters", "matter-filters", clientId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return staticMatters.filter(m => !clientId || m.clientMini?.id === clientId || m.clientMini?.clientId === clientId)
      }
      const r = await axiosClient.get("/api/matter/get/short-info", {
        params: { searchText: "", clientId, pageNumber: 0, pageSize: 50 },
      })
      return unwrapAxiosList<{ id?: string; matterId?: string; title?: string }>(r.data)
    },
    staleTime: 60 * 1000,
  })

  const matterOptions: Named[] = useMemo(() => (
    (mattersQuery.data ?? []).map((m) => ({
      id: m.matterId ?? m.id ?? "",
      label: m.title ?? "",
    })).filter(m => m.id)
  ), [mattersQuery.data])

  function currentFilters(): Record<string, unknown> {
    return { clientId, attorneyIds, practiceArea, matterId, procuredByIds, status, scope, partyOpposing }
  }

  function clear() {
    setClientId("")
    setAttorneyIds([])
    setPracticeArea("")
    setMatterId("")
    setProcuredByIds([])
    setStatus(DEFAULT_MATTER_STATUSES)
    setScope("")
    setPartyOpposing("")
    onReset()
  }

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await mattersApi.requestExcel(currentFilters()))
    } catch (error) {
      const message = (error as { response?: { data?: { Msg?: string } }; message?: string }).response?.data?.Msg
        ?? (error as { message?: string }).message
        ?? "Excel export failed"
      toast.error(message)
    } finally {
      setEmailing(false)
    }
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.5, alignItems: "start" }}>
      <ClientSelectFilter value={clientId || undefined} onChange={id => { setClientId(id ?? ""); setMatterId("") }} />
      <UserSelectFilter
        multiple
        value={attorneyIds}
        onChange={setAttorneyIds}
        label="Attorneys"
      />
      <PracticeAreaFilter value={practiceArea} onChange={setPracticeArea} />
      <Autocomplete
        size="small"
        options={matterOptions}
        value={matterOptions.find(m => m.id === matterId) ?? null}
        getOptionLabel={o => o.label}
        onChange={(_, value) => setMatterId(value?.id ?? "")}
        renderInput={params => <TextField {...params} label="Matters" />}
      />
      <UserSelectFilter
        multiple
        value={procuredByIds}
        onChange={setProcuredByIds}
        label="Procured By"
      />
      <StatusMultiFilter
        value={status}
        onChange={setStatus}
        options={MATTER_STATUS_OPTIONS}
        openImpliesReopen
      />
      <TextField size="small" label="Search By Scope" value={scope} onChange={e => setScope(e.target.value)} />
      <TextField size="small" label="Search By Opposing Party" value={partyOpposing} onChange={e => setPartyOpposing(e.target.value)} />
      <FilterActions
        onSearch={() => onSearch(currentFilters())}
        onClear={clear}
        onExport={emailExcel}
        exportMode="email"
        exporting={emailing}
        searchLabel="Search"
      />
    </Box>
  )
}
