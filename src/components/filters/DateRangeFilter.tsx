import { Box, TextField } from '@mui/material'
interface Props { fromDate?:string; toDate?:string; onChange:(f:{fromDate?:string;toDate?:string})=>void }
export function DateRangeFilter({ fromDate, toDate, onChange }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <TextField label="From Date" type="date" size="small" value={fromDate??''}
        slotProps={{ inputLabel: { shrink: true } }}
        onChange={(e)=>onChange({fromDate:e.target.value,toDate})} />
      <TextField label="To Date" type="date" size="small" value={toDate??''}
        slotProps={{ inputLabel: { shrink: true } }}
        onChange={(e)=>onChange({fromDate,toDate:e.target.value})} />
    </Box>
  )
}
