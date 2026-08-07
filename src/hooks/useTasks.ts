import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { tasksApi } from "@/api/tasks"
import type { GridParams } from "@/types/common.types"

const QK = {
  all:  () => ["tasks"] as const,
  list: (p: GridParams) => ["tasks","list",p] as const,
}

export const useTasksList = (p: GridParams) =>
  useQuery({ queryKey: QK.list(p), queryFn: () => tasksApi.getAll(p), placeholderData: (prev) => prev })

export function useCreateTask(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string,unknown>) => tasksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}

export function useApproveTask(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => tasksApi.approve(taskId, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}
