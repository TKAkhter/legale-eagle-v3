import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi } from "@/api/clients"
import type { GridParams } from "@/types/common.types"

const QK = {
  all:    ()          => ["clients"] as const,
  list:   (p: GridParams) => ["clients","list",p] as const,
  detail: (id: string)    => ["clients","detail",id] as const,
}

export const useClientsList = (p: GridParams) =>
  useQuery({ queryKey: QK.list(p), queryFn: () => clientsApi.getAll(p), placeholderData: (prev) => prev })

export const useClient = (id: string) =>
  useQuery({ queryKey: QK.detail(id), queryFn: () => clientsApi.getById(id), enabled: !!id })

export function useCreateClient(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string,unknown>) => clientsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}
