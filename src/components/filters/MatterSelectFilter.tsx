import { Autocomplete, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import { useDebounce } from '@hooks/useDebounce'
import { useState } from 'react'
import type { MatterMini } from '@/types/common.types'
interface Props { value?:string; onChange:(id?:string)=>void; label?:string }
export function MatterSelectFilter({ value, onChange, label='Matter' }: Props) {
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 400)
  const { data=[] } = useQuery({ queryKey: QK.matters.shortInfo(dq),
    queryFn: async()=>{ const r = await axiosClient.get('/api/matter/get/short-info',{params:{searchText:dq,pageNumber:0,pageSize:50}}); return r.data?.content ?? [] },
    enabled: dq.length>1 || !value })
  const selected = data.find((m:MatterMini)=>m.id===value) ?? null
  return (
    <Autocomplete size="small" options={data} value={selected} getOptionLabel={(o:MatterMini)=>o.title??''}
      onChange={(_,v)=>onChange(v?.id)} onInputChange={(_,v)=>setQ(v)} sx={{minWidth:240}}
      filterOptions={(x)=>x} renderInput={(params)=><TextField {...params} label={label}/>} />
  )
}
