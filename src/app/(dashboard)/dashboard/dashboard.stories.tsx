import type { Meta, StoryObj } from '@storybook/react'
import { dashboardHandlers } from '@/mocks/handlers/dashboard'
import DashboardPage from './page'

const meta: Meta = {
  title: 'Pages/Dashboard',
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [...dashboardHandlers] },
  },
}
export default meta

export const Default: StoryObj = { render: () => <DashboardPage /> }
