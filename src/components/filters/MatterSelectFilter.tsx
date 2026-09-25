import { Autocomplete, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import { useDebounce } from '@hooks/useDebounce'
import { useState } from 'react'
import { unwrapAxiosList } from '@lib/utils/unwrap'
import type { MatterMini } from '@/types/common.types'

interface Props {
  value?: string
  onChange: (id?: string) => void
  label?: string
  /** When set, list matters for this client (LMS MatterAutoSelector). */
  clientId?: string
}

export function MatterSelectFilter({ value, onChange, label = 'Matter', clientId }: Props) {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 400)
  const { data = [] } = useQuery({
    queryKey: clientId
      ? ['matters', 'mini-by-client', clientId, dq]
      : QK.matters.shortInfo(dq),
    queryFn: async () => {
      if (clientId) {
        const r = await axiosClient.get('/api/matter/mini/by/client', {
          params: { clientId },
        })
        const list = unwrapAxiosList<MatterMini>(r.data)
        const needle = dq.trim().toLowerCase()
        if (!needle) return list
        return list.filter(m => String(m.title ?? '').toLowerCase().includes(needle))
      }
      const r = await axiosClient.get('/api/matter/get/short-info', {
        params: { searchText: dq, pageNumber: 0, pageSize: 50 },
      })
      return unwrapAxiosList<MatterMini>(r.data)
    },
    enabled: Boolean(clientId) || dq.length > 1 || !value,
  })
  const selected = data.find((m) => m.id === value || (m as { matterId?: string }).matterId === value) ?? null
  return (
    <Autocomplete
      size="small"
      options={data}
      value={selected}
      getOptionLabel={(o) => o.title ?? ''}
      onChange={(_, v) => onChange((v as { matterId?: string })?.matterId ?? v?.id)}
      onInputChange={(_, v) => setQ(v)}
      sx={{ minWidth: 240 }}
      filterOptions={(x) => x}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  )
}
