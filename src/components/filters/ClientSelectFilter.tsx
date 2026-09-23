import { Autocomplete, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import { useDebounce } from '@hooks/useDebounce'
import { useState } from 'react'
import { unwrapAxiosList } from '@lib/utils/unwrap'
import type { ClientMini } from '@/types/common.types'

interface Props { value?: string; onChange: (id?: string) => void; label?: string }

export function ClientSelectFilter({ value, onChange, label = 'Client' }: Props) {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 400)
  const { data = [] } = useQuery({
    queryKey: QK.clients.shortInfo(dq),
    queryFn: async () => {
      const r = await axiosClient.get('/api/client/get/short-info', {
        params: { clientName: dq, pageNumber: 0, pageSize: 50 },
      })
      return unwrapAxiosList<ClientMini & { clientName?: string }>(r.data)
    },
    enabled: dq.length > 1 || !value,
  })
  const selected = data.find((c) => c.id === value) ?? null
  return (
    <Autocomplete
      size="small"
      options={data}
      value={selected}
      getOptionLabel={(o) =>
        (o as { clientName?: string }).clientName
        ?? o.companyName
        ?? `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim()
      }
      onChange={(_, v) => onChange(v?.id)}
      onInputChange={(_, v) => setQ(v)}
      sx={{ minWidth: 240 }}
      filterOptions={(x) => x}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  )
}
