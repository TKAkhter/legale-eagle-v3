import { TextField } from '@mui/material'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
interface Props<T extends FieldValues> { name:Path<T>; control:Control<T>; label:string; required?:boolean; disabled?:boolean }
export function ControlledDatePicker<T extends FieldValues>({ name, control, label, required, disabled }: Props<T>) {
  return <Controller name={name} control={control} render={({field,fieldState})=>(
    <TextField {...field} label={label} type="date" required={required} disabled={disabled} fullWidth size="small"
      slotProps={{ inputLabel: { shrink: true } }}
      error={!!fieldState.error} helperText={fieldState.error?.message} />
  )}/>
}
