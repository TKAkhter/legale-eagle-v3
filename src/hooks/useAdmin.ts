import { useQuery } from "@tanstack/react-query"
import { adminApi } from "@/api/admin"

export const useUsersMin = () =>
  useQuery({ queryKey: ["users","min"], queryFn: () => adminApi.getUsersMin(), staleTime: 10*60_000 })

export const usePracticeAreas = () =>
  useQuery({ queryKey: ["lookup","practiceAreas"], queryFn: () => adminApi.getPracticeAreas(), staleTime: 30*60_000 })

export const useLeadSources = () =>
  useQuery({ queryKey: ["lookup","leadSources"], queryFn: () => adminApi.getLeadSources(), staleTime: 30*60_000 })

export const useDepartments = () =>
  useQuery({ queryKey: ["lookup","departments"], queryFn: () => adminApi.getDepartments(), staleTime: 30*60_000 })

export const useDesignations = () =>
  useQuery({ queryKey: ["lookup","designations"], queryFn: () => adminApi.getDesignations(), staleTime: 30*60_000 })
