/**
 * Lazy wrapper for react-apexcharts.
 * ApexCharts is 581 kB raw — only load on pages that need it.
 */
import { lazy, Suspense } from 'react'
import { Skeleton } from '@mui/material'
import type { Props as ApexProps } from 'react-apexcharts'

const ReactApexChart = lazy(() => import('react-apexcharts'))

export function ApexChart(props: ApexProps) {
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={(props.height as number) ?? 200} />}>
      <ReactApexChart {...props} />
    </Suspense>
  )
}
