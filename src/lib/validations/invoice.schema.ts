import { z } from 'zod'

export const invoiceSchema = z.object({
  matterId:     z.string().min(1, 'Matter is required'),
  lfaId:        z.string().optional(),
  billingType:  z.string().optional(),
  issueDate:    z.string().min(1, 'Issue date is required'),
  dueDate:      z.string().min(1, 'Due date is required'),
  tax:          z.number().min(0).max(100).default(5),
  discount:     z.number().min(0).max(100).default(0),
  notes:        z.string().optional(),
  activityIds:  z.array(z.string()).optional(),
})
export type InvoiceForm = z.infer<typeof invoiceSchema>
