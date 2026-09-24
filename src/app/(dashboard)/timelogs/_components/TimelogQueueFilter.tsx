/**
 * Shared filters for non-hourly timelog queues (review / pre-approval).
 */
import { useMemo, useState } from "react"
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { UserSelectFilter } from "@components/filters/UserSelectFilter"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import type { FilterPanelProps } from "@components/data-grid/types"

interface Props extends FilterPanelProps {
  showActingHod?: boolean
}

export function TimelogQueueFilter({ onSearch, onReset, filters, showActingHod }: Props) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const clientId = String(f.clientId ?? "")

  const lfasQ = useQuery({
    queryKey: ["lfa", "mini", "timelog-queue", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "lfa1", agreementNo: "LFA-001" }]
      }
      const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId } })
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string }[]
    },
    staleTime: 60_000,
  })

  const lfaOpts = useMemo(
    () => (lfasQ.data ?? [])
      .map(l => ({ id: String(l.id ?? ""), label: String(l.agreementNo ?? l.id ?? "") }))
      .filter(l => l.id),
    [lfasQ.data],
  )

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter
        value={clientId || undefined}
        onChange={v => {
          set("clientId", v)
          set("agreementId", "")
        }}
      />
      <MatterSelectFilter value={String(f.matterId ?? "") || undefined} onChange={v => set("matterId", v)} />
      <Autocomplete
        size="small"
        sx={{ minWidth: 180 }}
        options={lfaOpts}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={lfaOpts.find(o => o.id === String(f.agreementId ?? "")) ?? null}
        onChange={(_, v) => set("agreementId", v?.id ?? "")}
        disabled={!clientId}
        renderInput={params => <TextField {...params} label="Agreement (LFA)" />}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>LFA Billing Type</InputLabel>
        <Select
          label="LFA Billing Type"
          value={String(f.lfaBillingType ?? "")}
          onChange={e => set("lfaBillingType", e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
        </Select>
      </FormControl>
      {showActingHod && (
        <UserSelectFilter
          value={String(f.actingHodUserId ?? "")}
          onChange={v => set("actingHodUserId", v ?? "")}
          label="Acting HOD"
        />
      )}
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}
