import type { Meta, StoryObj } from '@storybook/react'
import { useForm } from 'react-hook-form'
import { Box } from '@mui/material'
import { ControlledInput } from './ControlledInput'

const meta: Meta = {
  title: 'Forms/ControlledInput',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}
export default meta

function Wrapper({ type, label, required, disabled }: { type?: string; label?: string; required?: boolean; disabled?: boolean }) {
  const { control } = useForm({ defaultValues: { field: '' } })
  return (
    <Box sx={{ width: 320 }}>
      <ControlledInput name="field" control={control} label={label ?? 'Input Label'} type={type} required={required} disabled={disabled} />
    </Box>
  )
}

export const Text:     StoryObj = { render: () => <Wrapper label="Full Name" /> }
export const Email:    StoryObj = { render: () => <Wrapper label="Email Address" type="email" /> }
export const Password: StoryObj = { render: () => <Wrapper label="Password" type="password" /> }
export const Required: StoryObj = { render: () => <Wrapper label="Required Field" required /> }
export const Disabled: StoryObj = { render: () => <Wrapper label="Disabled" disabled /> }
export const Number:   StoryObj = { render: () => <Wrapper label="Amount (AED)" type="number" /> }
