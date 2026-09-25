import { z } from 'zod'

export const activitySchema = z.object({
  clientId:                z.string().optional(),
  matterId:                z.string().optional(),
  leadId:                  z.string().optional(),
  activity:                z.string().min(1, 'Description is required'),
  activityType:            z.enum(['Time', 'Expense', 'Fixed']),
  billingType:             z.string().optional(),
  hours:                   z.coerce.number().optional(),
  minutes:                 z.coerce.number().optional(),
  rate:                    z.coerce.number().optional(),
  billable:                z.boolean(),
  entryDate:               z.string().min(1, 'Date is required'),
  responsiblePersonId:     z.string().optional(),
  activityCategory:        z.string().optional(),
  disbursementType:        z.string().optional(),
  disbursementPaymentType: z.string().optional(),
}).superRefine((data, ctx) => {
  const isLead = data.activityCategory === 'LEAD' || !!data.leadId
  if (!isLead && !data.matterId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Matter is required', path: ['matterId'] })
  }
  if (isLead && !data.leadId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Lead is required', path: ['leadId'] })
  }
})

export type ActivityForm = z.infer<typeof activitySchema>
