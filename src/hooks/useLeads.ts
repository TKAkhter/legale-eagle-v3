import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import type { GridParams } from "@/types/common.types"

const QK = {
  all:      ()          => ["leads"] as const,
  list:     (p: GridParams) => ["leads","list",p] as const,
  detail:   (id: string)    => ["leads","detail",id] as const,
  followups:(id: string)    => ["leads","followups",id] as const,
}

export const useLeadsList = (p: GridParams) =>
  useQuery({ queryKey: QK.list(p), queryFn: () => leadsApi.getAll(p), placeholderData: (prev) => prev })

export const useLead = (id: string) =>
  useQuery({ queryKey: QK.detail(id), queryFn: () => leadsApi.getById(id), enabled: !!id })

export const useLeadFollowups = (id: string) =>
  useQuery({ queryKey: QK.followups(id), queryFn: () => leadsApi.getFollowups(id), enabled: !!id })

export function useCreateLead(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string,unknown>) => leadsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}

export function useUpdateLead(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: Record<string,unknown> }) => leadsApi.update(leadId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}

export function useConvertLead(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadId, matter }: { leadId: string; matter: Record<string,unknown> }) => leadsApi.convert(leadId, matter),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.all() }); opts?.onSuccess?.() },
  })
}
