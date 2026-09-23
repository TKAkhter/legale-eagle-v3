import { FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import type { BillingType } from '@/types/common.types'
const OPTIONS:BillingType[] = ['Hourly','Fixed','Session','Expense','NoAgreement','Contingent','NonContingent','Advance','Enforcement','SuccessRate','Courier','Translation']
interface Props { value?:string; onChange:(v?:string)=>void }
export function BillingTypeFilter({ value, onChange }: Props) {
  return (
    <FormControl size="small" sx={{minWidth:160}}>
      <InputLabel>Billing Type</InputLabel>
      <Select label="Billing Type" value={value??''} onChange={(e)=>onChange(e.target.value||undefined)}>
        <MenuItem value=""><em>All</em></MenuItem>
        {OPTIONS.map((o)=><MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  )
}
