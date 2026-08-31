/**
 * client.schema.ts — Zod validation schema for Client forms.
 * Matches the inline schema in ClientFormDrawer.tsx exactly.
 */
import { z } from 'zod'

export const clientSchema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().optional(),
  companyName:  z.string().optional(),
  clientType:   z.enum(['COMPANY', 'PERSON']),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  phone:        z.string().optional(),
  trnNo:        z.string().optional(),
})

export type ClientForm = z.infer<typeof clientSchema>
