import { TextField, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useDebounce } from '@hooks/useDebounce'
import { useEffect, useState } from 'react'
interface Props { value?:string; onChange:(v:string)=>void; placeholder?:string; delay?:number }
export function SearchInput({ value='', onChange, placeholder='Search...', delay=400 }: Props) {
  const [local, setLocal] = useState(value)
  const debounced = useDebounce(local, delay)
  useEffect(()=>{ onChange(debounced) },[debounced])
  return (
    <TextField size="small" placeholder={placeholder} value={local} onChange={(e)=>setLocal(e.target.value)}
      slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> } }} />
  )
}
