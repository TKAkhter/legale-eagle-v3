import type { Meta, StoryObj } from '@storybook/react'
import { billingHandlers } from '@/mocks/handlers/billing'
import BillingsPage from './page'

const meta: Meta = {
  title: 'Pages/Billing',
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [...billingHandlers] },
  },
}
export default meta

export const Default: StoryObj = { render: () => <BillingsPage /> }
