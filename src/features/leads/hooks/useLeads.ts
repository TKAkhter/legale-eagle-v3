import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../api/leads.api"
import type { GridParams } from "@/types"
import type { CreateLeadDto } from "../api/leads.types"
const K = { all: ()=>["leads"] as const, list: (p:GridParams)=>["leads","list",p] as const, detail: (id:string)=>["leads","detail",id] as const, followups: (id:string)=>["leads","followups",id] as const }
export const useLeadsList     = (p:GridParams) => useQuery({ queryKey: K.list(p), queryFn: ()=>leadsApi.getAll(p), placeholderData: (prev)=>prev })
export const useLead          = (id:string)    => useQuery({ queryKey: K.detail(id), queryFn: ()=>leadsApi.getById(id), enabled: !!id })
export const useLeadFollowups = (id:string)    => useQuery({ queryKey: K.followups(id), queryFn: ()=>leadsApi.getFollowups(id), enabled: !!id })
export function useCreateLead(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({ mutationFn:(dto:CreateLeadDto)=>leadsApi.create(dto), onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()} }) }
export function useUpdateLead(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({ mutationFn:({leadId,dto}:{leadId:string;dto:Partial<CreateLeadDto>})=>leadsApi.update(leadId,dto), onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()} }) }
