import { Autocomplete, TextField } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import type { Department } from '@/types/common.types'
interface Props { value?:string; onChange:(id?:string)=>void }
export function DepartmentFilter({ value, onChange }: Props) {
  const { data=[] } = useQuery({ queryKey: QK.departments.list(),
    queryFn: async()=>{ const r=await axiosClient.get('/api/util/list/department'); return r.data?.data ?? r.data ?? [] },
    staleTime:10*60*1000 })
  const selected = data.find((d:Department)=>d.id===value) ?? null
  return (
    <Autocomplete size="small" options={data} value={selected} getOptionLabel={(o:Department)=>o.name}
      onChange={(_,v)=>onChange(v?.id)} sx={{minWidth:200}}
      renderInput={(params)=><TextField {...params} label="Department"/>} />
  )
}
