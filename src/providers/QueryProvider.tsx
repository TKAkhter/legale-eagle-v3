import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@lib/query/queryClient'
import { featureFlags } from '@config/featureFlags'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {featureFlags.isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
