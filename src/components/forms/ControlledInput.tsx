import { useState } from 'react'
import { TextField, InputAdornment, IconButton } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

interface Props<T extends FieldValues> {
  name:       Path<T>
  control:    Control<T>
  label:      string
  type?:      string
  multiline?: boolean
  rows?:      number
  required?:  boolean
  disabled?:  boolean
  placeholder?: string
}

export function ControlledInput<T extends FieldValues>({
  name, control, label, type = 'text', multiline, rows, required, disabled, placeholder,
}: Props<T>) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={field.value ?? ''}
          label={label}
          type={resolvedType}
          multiline={multiline}
          rows={rows}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          fullWidth
          size="small"
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          slotProps={isPassword ? {
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={() => setShowPassword(v => !v)}
                    onMouseDown={e => e.preventDefault()}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <VisibilityOffIcon fontSize="small" />
                      : <VisibilityIcon    fontSize="small" />
                    }
                  </IconButton>
                </InputAdornment>
              ),
            },
          } : undefined}
        />
      )}
    />
  )
}
