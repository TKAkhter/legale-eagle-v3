import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '@mui/material'
import { NotificationsPanel } from './NotificationsPanel'
import { miscHandlers } from '@/mocks/handlers/misc'

const meta: Meta<typeof NotificationsPanel> = {
  title: 'Layout/NotificationsPanel',
  component: NotificationsPanel,
  parameters: {
    layout: 'centered',
    msw: { handlers: miscHandlers },
  },
}
export default meta

export const Default: StoryObj = {
  render: () => (
    <Box sx={{ p: 4, display:'flex', justifyContent:'center' }}>
      <NotificationsPanel />
    </Box>
  ),
}
