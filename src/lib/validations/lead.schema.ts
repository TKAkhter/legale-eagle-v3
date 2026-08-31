/**
 * lead.schema.ts — Zod validation schema for Lead forms.
 *
 * This schema is the single source of truth for lead form validation.
 * It matches the inline schema in LeadFormDrawer.tsx exactly.
 *
 * When react-hook-form version stabilises, import this directly:
 *   import { leadSchema, LeadForm } from "@/lib/validations/lead.schema"
 */
import { z } from 'zod'

export const leadSchema = z.object({
  firstName:      z.string().min(1, 'First name is required'),
  lastName:       z.string().optional(),
  companyName:    z.string().optional(),
  leadType:       z.enum(['COMPANY', 'PERSON']),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  phone:          z.string().optional(),
  practiceAreaId: z.string().optional(),
  leadSourceId:   z.string().optional(),
  lawyerId:       z.string().optional(),
  description:    z.string().optional(),
})

export type LeadForm = z.infer<typeof leadSchema>
