import { Autocomplete, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import { useDebounce } from '@hooks/useDebounce'
import { useState } from 'react'
import type { ClientMini } from '@/types/common.types'
interface Props { value?:string; onChange:(id?:string)=>void; label?:string }
export function ClientSelectFilter({ value, onChange, label='Client' }: Props) {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 400)
  const { data=[] } = useQuery({ queryKey: QK.clients.shortInfo(dq),
    queryFn: async()=>{ const r = await axiosClient.get('/api/client/get/short-info',{params:{clientName:dq,pageNumber:0,pageSize:50}}); return r.data?.content ?? [] },
    enabled: dq.length>1 || !value })
  const selected = data.find((c:ClientMini)=>c.id===value) ?? null
  return (
    <Autocomplete size="small" options={data} value={selected}
      getOptionLabel={(o:ClientMini)=>o.companyName ?? `${o.firstName} ${o.lastName}`}
      onChange={(_,v)=>onChange(v?.id)} onInputChange={(_,v)=>setQ(v)} sx={{minWidth:240}}
      filterOptions={(x)=>x} renderInput={(params)=><TextField {...params} label={label}/>} />
  )
}
