import { z } from 'zod'
export const taskSchema = z.object({
  taskName:         z.string().min(1, 'Task name is required'),
  eventType:        z.enum(['MATTER','CLIENT','LEAD','GENERAL']),
  eventTypeId:      z.string().optional(),
  assignedToId:     z.string().optional(),
  taskDeadLine:     z.string().optional(),
  priority:         z.enum(['High','Normal','Low']),
  taskDescription:  z.string().optional(),
  requiresApproval: z.boolean(),
})
export type TaskForm = z.infer<typeof taskSchema>
