import { z } from 'zod'
export const leadSchema = z.object({
  firstName:      z.string().min(1, 'First name is required'),
  lastName:       z.string().optional(),
  companyName:    z.string().optional(),
  leadType:       z.enum(['COMPANY', 'PERSON']),
  email:          z.string().optional(),
  phone:          z.string().optional(),
  practiceAreaId: z.string().optional(),
  leadSourceId:   z.string().optional(),
  lawyerId:       z.string().optional(),
  description:    z.string().optional(),
})
export type LeadForm = z.infer<typeof leadSchema>
