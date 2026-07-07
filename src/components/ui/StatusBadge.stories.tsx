import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '@mui/material'
import { StatusBadge } from './StatusBadge'

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof StatusBadge>

export const AllStatuses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 2 }}>
      {['active','inactive','Open','Closed','Pending','Approved','Rejected','Draft','Paid','Overdue','Due','Partially_Paid','NEW','FOLLOW_UP','PROPOSAL','CONVERTED','Hourly','Fixed','Session','Contingent'].map(s => (
        <StatusBadge key={s} status={s} />
      ))}
    </Box>
  ),
}

export const Active:   Story = { args: { status: 'active' } }
export const Approved: Story = { args: { status: 'Approved' } }
export const Pending:  Story = { args: { status: 'Pending' } }
export const Overdue:  Story = { args: { status: 'Overdue' } }
export const Draft:    Story = { args: { status: 'Draft' } }
