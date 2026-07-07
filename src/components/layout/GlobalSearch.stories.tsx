import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '@mui/material'
import { GlobalSearch } from './GlobalSearch'
import { leadHandlers }   from '@/mocks/handlers/leads'
import { clientHandlers } from '@/mocks/handlers/clients'
import { matterHandlers } from '@/mocks/handlers/matters'

const meta: Meta<typeof GlobalSearch> = {
  title: 'Layout/GlobalSearch',
  component: GlobalSearch,
  parameters: {
    layout: 'centered',
    msw: { handlers: [...leadHandlers, ...clientHandlers, ...matterHandlers] },
  },
}
export default meta

export const Default: StoryObj = {
  render: () => (
    <Box sx={{ p: 4, width: 500 }}>
      <GlobalSearch />
      <Box sx={{ mt: 2, color: 'text.secondary', fontSize: 13 }}>
        Try typing "Al Rashid" or "Harper" to see search results
      </Box>
    </Box>
  ),
}
