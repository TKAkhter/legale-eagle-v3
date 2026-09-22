/**
 * task.transformer.ts — normalises task data from the backend.
 *
 * Flow: tasksApi.getAll() → raw BE response → transformTask() → DataGrid
 */

export interface Task {
  id:            string
  taskName:      string
  taskStatus:    string
  taskType:      string
  priority:      string
  taskDeadLine:  string
  createdAt:     string
  assignedTo:    { id: string; name: string } | null
  matter:        { id: string; title: string; matterId?: string } | null
  description?:  string
  billable:      boolean
  hours?:        number
}

export function transformTask(raw: Record<string, unknown>): Task {
  const assignedTo = raw.assignedTo as Record<string,unknown> | null
  const matter     = raw.matter     as Record<string,unknown> | null

  return {
    id:           String(raw.id           ?? raw.taskId ?? ""),
    taskName:     String(raw.taskName     ?? raw.name   ?? ""),
    taskStatus:   String(raw.taskStatus   ?? raw.status ?? "Pending"),
    taskType:     String(raw.taskType     ?? "General"),
    priority:     String(raw.priority     ?? "Normal"),
    taskDeadLine: String(raw.taskDeadLine ?? raw.dueDate ?? ""),
    createdAt:    String(raw.createdAt    ?? ""),
    assignedTo: assignedTo ? {
      id:   String(assignedTo.id ?? ""),
      name: `${assignedTo.firstName ?? ""} ${assignedTo.lastName ?? ""}`.trim(),
    } : null,
    matter: matter ? {
      id:       String(matter.id       ?? matter.matterId ?? ""),
      title:    String(matter.title    ?? ""),
      matterId: String(matter.matterId ?? matter.id       ?? ""),
    } : null,
    description: raw.description ? String(raw.description) : undefined,
    billable:    Boolean(raw.billable ?? raw.isBillable ?? true),
    hours:       raw.totalHours ? Number(raw.totalHours) : undefined,
  }
}

export function transformTaskPage(raw: Record<string,unknown>[]): Task[] {
  return raw.map(transformTask)
}
