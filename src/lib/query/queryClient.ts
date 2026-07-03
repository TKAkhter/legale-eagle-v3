import { QueryClient } from '@tanstack/react-query'

/**
 * queryClient.ts
 *
 * Central TanStack Query configuration.
 * Conservative defaults for a legal app — data accuracy matters more than speed.
 *
 * Next.js migration:
 *   Server Components: use fetch() directly (no QueryClient needed)
 *   Client Components: this QueryClient is identical — no changes needed
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30 seconds — legal data changes frequently enough that stale data is a problem
      staleTime: 30 * 1000,
      // Keep inactive data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry once on network errors, not on 4xx responses
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        // Don't retry auth errors or not-found
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 1
      },
      retryDelay: 1000,
      // Refetch when window regains focus — good for long-lived legal sessions
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0,
    },
  },
})
