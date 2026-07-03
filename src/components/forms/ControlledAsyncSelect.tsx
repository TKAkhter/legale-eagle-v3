import { Autocomplete, TextField, CircularProgress } from '@mui/material'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import type { SelectOption } from '@/types/common.types'
interface Props<T extends FieldValues> { name:Path<T>; control:Control<T>; label:string; options:SelectOption[]; loading?:boolean; onInputChange?:(v:string)=>void; required?:boolean }
export function ControlledAsyncSelect<T extends FieldValues>({ name, control, label, options, loading, onInputChange, required }: Props<T>) {
  return <Controller name={name} control={control} render={({field,fieldState})=>(
    <Autocomplete options={options} loading={loading} getOptionLabel={o=>typeof o==='string'?o:o.label} value={options.find(o=>o.value===field.value)??null}
      onChange={(_,v)=>field.onChange(v?.value)} onInputChange={(_,v)=>onInputChange?.(v)}
      filterOptions={x=>x}
      renderInput={params=>(
        <TextField {...params} label={label} required={required} size="small" error={!!fieldState.error} helperText={fieldState.error?.message}
          slotProps={{ input: { ...params.slotProps?.input, endAdornment: <>{loading && <CircularProgress size={16} />}{params.slotProps?.input?.endAdornment}</> } }} />
      )} />
  )}/>
}
