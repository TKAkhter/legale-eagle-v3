import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button, Typography, Box } from '@mui/material'
import { Modal } from './Modal'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Confirm Action"
          actions={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained">Confirm</Button></>}>
          <Typography>Are you sure you want to proceed with this action? This cannot be undone.</Typography>
        </Modal>
      </>
    )
  },
}

export const WithForm: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="outlined" onClick={() => setOpen(true)}>Open Form Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Create Group" maxWidth="sm"
          actions={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained">Create</Button></>}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Fill in the group details below.</Typography>
            <input placeholder="Group name" style={{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:6, fontSize:14 }} />
          </Box>
        </Modal>
      </>
    )
  },
}
