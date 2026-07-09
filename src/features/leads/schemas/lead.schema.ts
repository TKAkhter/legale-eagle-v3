import { z } from "zod"
export const leadSchema = z.object({ firstName: z.string().min(1,"Required"), lastName: z.string().optional(), companyName: z.string().optional(), leadType: z.enum(["COMPANY","PERSON"]), email: z.string().email("Invalid").optional().or(z.literal("")), phone: z.string().optional(), practiceAreaId: z.string().optional(), leadSourceId: z.string().optional(), lawyerId: z.string().optional(), description: z.string().optional() })
export type LeadFormValues = z.infer<typeof leadSchema>
