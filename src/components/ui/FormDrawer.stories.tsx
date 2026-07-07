import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button, Box, Typography } from '@mui/material'
import { FormDrawer } from './FormDrawer'

const meta: Meta<typeof FormDrawer> = {
  title: 'UI/FormDrawer',
  component: FormDrawer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof FormDrawer>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Open Form Drawer</Button>
        <FormDrawer open={open} onClose={() => setOpen(false)} title="New Lead" subtitle="Add a prospective client"
          onSubmit={() => setOpen(false)} submitLabel="Create Lead">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <input placeholder="First name *" style={{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:6, fontSize:14 }} />
            <input placeholder="Last name"    style={{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:6, fontSize:14 }} />
            <input placeholder="Email"        style={{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:6, fontSize:14 }} />
            <input placeholder="Phone"        style={{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:6, fontSize:14 }} />
          </Box>
        </FormDrawer>
      </Box>
    )
  },
}

export const Submitting: Story = {
  args: {
    open: true, title: 'New Lead', subtitle: 'Saving…',
    onSubmit: () => {}, onClose: () => {}, isSubmitting: true, submitLabel: 'Create Lead',
    children: <Typography color="text.secondary">Form content here</Typography>,
  },
}
