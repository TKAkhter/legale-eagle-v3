import { z } from 'zod'
export const clientSchema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().optional(),
  companyName:  z.string().optional(),
  clientType:   z.enum(['COMPANY', 'PERSON']),
  email:        z.string().optional(),
  phone:        z.string().optional(),
  trnNo:        z.string().optional(),
  nationality:  z.string().optional(),
  referral:     z.boolean(),
  referralName: z.string().optional(),
})
export type ClientForm = z.infer<typeof clientSchema>
