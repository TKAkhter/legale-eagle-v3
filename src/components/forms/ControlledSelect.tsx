import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import type { SelectOption } from '@/types/common.types'
interface Props<T extends FieldValues> { name:Path<T>; control:Control<T>; label:string; options:SelectOption[]; required?:boolean; disabled?:boolean }
export function ControlledSelect<T extends FieldValues>({ name, control, label, options, required, disabled }: Props<T>) {
  return <Controller name={name} control={control} render={({field,fieldState})=>(
    <FormControl fullWidth size="small" required={required} disabled={disabled} error={!!fieldState.error}>
      <InputLabel>{label}</InputLabel>
      <Select {...field} label={label}>
        {options.map(o=><MenuItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</MenuItem>)}
      </Select>
      {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
    </FormControl>
  )}/>
}
