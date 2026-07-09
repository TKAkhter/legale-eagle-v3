import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi } from "../api/clients.api"
import type { GridParams } from "@/types"
import type { CreateClientDto } from "../api/clients.types"
const K = { all:()=>["clients"] as const, list:(p:GridParams)=>["clients","list",p] as const, detail:(id:string)=>["clients","detail",id] as const }
export const useClientsList = (p:GridParams) => useQuery({queryKey:K.list(p),queryFn:()=>clientsApi.getAll(p),placeholderData:(prev)=>prev})
export const useClient = (id:string) => useQuery({queryKey:K.detail(id),queryFn:()=>clientsApi.getById(id),enabled:!!id})
export function useCreateClient(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({mutationFn:(dto:CreateClientDto)=>clientsApi.create(dto),onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()}}) }
export function useUpdateClient(opts?:{onSuccess?:()=>void}) { const qc=useQueryClient(); return useMutation({mutationFn:({id,dto}:{id:string;dto:Partial<CreateClientDto>})=>clientsApi.update(id,dto),onSuccess:()=>{qc.invalidateQueries({queryKey:K.all()});opts?.onSuccess?.()}}) }
