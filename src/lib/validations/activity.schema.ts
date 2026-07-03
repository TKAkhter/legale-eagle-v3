import { z } from 'zod'
export const activitySchema = z.object({
  matterId:            z.string().min(1, 'Matter is required'),
  activity:            z.string().min(1, 'Description is required'),
  activityType:        z.enum(['Time','Expense','Fixed']),
  billingType:         z.string().optional(),
  hours:               z.coerce.number().optional(),
  minutes:             z.coerce.number().optional(),
  rate:                z.coerce.number().optional(),
  billable:            z.boolean(),
  entryDate:           z.string().min(1, 'Date is required'),
  responsiblePersonId: z.string().optional(),
  activityCategory:    z.string().optional(),
})
export type ActivityForm = z.infer<typeof activitySchema>
