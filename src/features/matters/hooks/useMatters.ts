import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "../api/matters.api"
import type { GridParams } from "@/types"
import type { CreateMatterDto } from "../api/matters.types"
const K = { all:()=>["matters"] as const, list:(p:GridParams)=>["matters","list",p] as const, detail:(id:string)=>["matters","detail",id] as const }
export const useMattersList = (p:GridParams) => useQuery({queryKey:K.list(p),queryFn:()=>mattersApi.getAll(p),placeholderData:(prev)=>prev})
export const useMatter = (id:string) => useQuery({queryKey:K.detail(id),queryFn:()=>mattersApi.getById(id),enabled:!!id})
export function useCreateMatter(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({mutationFn:(dto:CreateMatterDto)=>mattersApi.create(dto),onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()}}) }
export function useUpdateMatter(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({mutationFn:({id,dto}:{id:string;dto:Partial<CreateMatterDto>})=>mattersApi.update(id,dto),onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()}}) }
export function useCloseMatter(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({mutationFn:(d:{matterId:string;closeDate:string;closeReason:string;closingNote:string})=>mattersApi.close(d.matterId,d.closeDate,d.closeReason,d.closingNote),onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()}}) }
