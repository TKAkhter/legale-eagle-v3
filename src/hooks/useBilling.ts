import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { billingApi } from "@/api/billing"
import type { GridParams } from "@/types/common.types"

const QK = {
  all:    ()          => ["billing"] as const,
  list:   (p: GridParams) => ["billing","list",p] as const,
  detail: (id: string)    => ["billing","detail",id] as const,
}

export const useInvoicesList = (p: GridParams) =>
  useQuery({ queryKey: QK.list(p), queryFn: () => billingApi.getAll(p), placeholderData: (prev) => prev })

export const useInvoice = (id: string) =>
  useQuery({ queryKey: QK.detail(id), queryFn: () => billingApi.getById(id), enabled: !!id })

export function useRecordPayment(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: Record<string,unknown> }) => billingApi.recordPayment(invoiceId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}
