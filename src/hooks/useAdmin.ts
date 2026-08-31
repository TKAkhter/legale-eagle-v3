/**
 * useAdmin.ts — hooks for admin data.
 *
 * These wrap adminApi calls so pages get standard TanStack Query
 * caching, loading states, and error handling without boilerplate.
 *
 * Usage:
 *   const { data: users, isLoading } = useUsersList({ pageSize: 25 })
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminApi } from "@/api/admin"
import type { GridParams } from "@/types/common.types"

const QK = {
  users:   { list: (p: GridParams) => ["admin","users","list",p] as const },
  groups:  { list: () => ["admin","groups"] as const },
  lookups: { practiceAreas: () => ["lookups","practiceAreas"] as const,
             leadSources:   () => ["lookups","leadSources"] as const,
             departments:   () => ["lookups","departments"] as const,
             designations:  () => ["lookups","designations"] as const },
}

export const useUsersList = (p: GridParams) =>
  useQuery({ queryKey: QK.users.list(p), queryFn: () => adminApi.getUsers(p.filters ?? {}), placeholderData: prev => prev })

export const useGroupsList = () =>
  useQuery({ queryKey: QK.groups.list(), queryFn: () => adminApi.getGroups(), staleTime: 5 * 60_000 })

export const usePracticeAreas = () =>
  useQuery({ queryKey: QK.lookups.practiceAreas(), queryFn: () => adminApi.getPracticeAreas(), staleTime: 10 * 60_000 })

export const useLeadSources = () =>
  useQuery({ queryKey: QK.lookups.leadSources(), queryFn: () => adminApi.getLeadSources(), staleTime: 10 * 60_000 })

export const useDepartments = () =>
  useQuery({ queryKey: QK.lookups.departments(), queryFn: () => adminApi.getDepartments(), staleTime: 10 * 60_000 })

export const useDesignations = () =>
  useQuery({ queryKey: QK.lookups.designations(), queryFn: () => adminApi.getDesignations(), staleTime: 10 * 60_000 })
