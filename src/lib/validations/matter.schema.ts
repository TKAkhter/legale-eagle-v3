import { z } from 'zod'
export const matterSchema = z.object({
  title:                  z.string().min(1, 'Matter title is required'),
  clientId:               z.string().min(1, 'Client is required'),
  billingType:            z.enum(['Hourly','Fixed','Session','Expense','NoAgreement','Contingent','NonContingent','Advance','Enforcement','SuccessRate']),
  responsibleAttorneyId:  z.string().optional(),
  practiceAreaId:         z.string().optional(),
  departmentId:           z.string().optional(),
  description:            z.string().optional(),
  caseNo:                 z.string().optional(),
  courtLocation:          z.string().optional(),
  openDate:               z.string().optional(),
})
export type MatterForm = z.infer<typeof matterSchema>
