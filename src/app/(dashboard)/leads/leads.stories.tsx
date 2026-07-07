import type { Meta, StoryObj } from '@storybook/react'
import { leadHandlers } from '@/mocks/handlers/leads'
import LeadsPage from './page'

const meta: Meta = {
  title: 'Pages/Leads',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [...leadHandlers] },
  },
}
export default meta

export const Default: StoryObj = { render: () => <LeadsPage /> }
