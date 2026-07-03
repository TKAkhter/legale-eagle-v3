import { Autocomplete, TextField, Avatar, Box, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'
import type { UserMini } from '@/types/common.types'
interface Props { value?:string; onChange:(id?:string)=>void; label?:string }
export function UserSelectFilter({ value, onChange, label='User' }: Props) {
  const { data=[] } = useQuery({ queryKey: QK.users.mini(), queryFn: async()=>{
    const r = await axiosClient.get('/api/user/get/min'); return r.data?.data ?? r.data ?? []
  }, staleTime: 5*60*1000 })
  const selected = data.find((u:UserMini)=>u.id===value) ?? null
  return (
    <Autocomplete size="small" options={data} value={selected} getOptionLabel={(o:UserMini)=>`${o.firstName} ${o.lastName}`}
      onChange={(_,v)=>onChange(v?.id)} sx={{minWidth:220}}
      renderInput={(params)=><TextField {...params} label={label}/>}
      renderOption={(props,o:UserMini)=>(
        <Box component="li" {...props} sx={{ gap: 1, display: "flex", alignItems: "center" }}>
          <Avatar src={o.profilePic} sx={{width:24,height:24,fontSize:12}}>{o.firstName[0]}</Avatar>
          <Typography variant="body2">{o.firstName} {o.lastName}</Typography>
        </Box>
      )} />
  )
}
