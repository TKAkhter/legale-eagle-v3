import { TextField } from '@mui/material'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
interface Props<T extends FieldValues> { name:Path<T>; control:Control<T>; label:string; type?:string; multiline?:boolean; rows?:number; required?:boolean; disabled?:boolean }
export function ControlledInput<T extends FieldValues>({ name, control, label, type='text', multiline, rows, required, disabled }: Props<T>) {
  return <Controller name={name} control={control} render={({field,fieldState})=>(
    <TextField {...field} label={label} type={type} multiline={multiline} rows={rows} required={required} disabled={disabled} fullWidth size="small" error={!!fieldState.error} helperText={fieldState.error?.message} />
  )}/>
}
