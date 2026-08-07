import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import type { GridParams } from "@/types/common.types"

const QK = {
  all:    ()              => ["matters"] as const,
  list:   (p: GridParams) => ["matters","list",p] as const,
  detail: (id: string)    => ["matters","detail",id] as const,
}

export const useMattersList = (p: GridParams) =>
  useQuery({ queryKey: QK.list(p), queryFn: () => mattersApi.getAll(p), placeholderData: (prev) => prev })

export function useCreateMatter(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string,unknown>) => mattersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}
