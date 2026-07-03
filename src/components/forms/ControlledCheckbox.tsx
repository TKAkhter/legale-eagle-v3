import { FormControlLabel, Checkbox, FormHelperText, Box } from '@mui/material'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
interface Props<T extends FieldValues> { name: Path<T>; control: Control<T>; label: string; disabled?: boolean }
export function ControlledCheckbox<T extends FieldValues>({ name, control, label, disabled }: Props<T>) {
  return <Controller name={name} control={control} render={({ field, fieldState }) => (
    <Box>
      <FormControlLabel control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />} label={label} />
      {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
    </Box>
  )} />
}
