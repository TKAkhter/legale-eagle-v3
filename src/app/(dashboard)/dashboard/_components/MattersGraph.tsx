import { Paper, Typography, Box } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { ApexChart } from "@components/charts/ApexChart"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"

export function MattersGraph() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "monthly-matters"],
    queryFn: () => dashboardApi.monthlyMatters(),
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <PanelLoader label="Loading matter analysis…" />

  const open = (data?.open ?? []) as number[]
  const closed = (data?.closed ?? data?.close ?? []) as number[]
  const total = (data?.total ?? []) as number[]
  const categories = open.map((_, i) => `M${i + 1}`)

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        MATTERS — Analysis
      </Typography>
      <Box sx={{ minHeight: 280 }}>
        <ApexChart
          type="line"
          height={280}
          series={[
            { name: "Open", type: "column", data: open },
            { name: "Closed", type: "column", data: closed },
            { name: "Total", type: "line", data: total },
          ]}
          options={{
            chart: { toolbar: { show: false }, stacked: false },
            stroke: { width: [0, 0, 3] },
            colors: ["#2196f3", "#4caf50", "#a8324e"],
            xaxis: { categories },
            legend: { position: "top" },
            dataLabels: { enabled: false },
          }}
        />
      </Box>
    </Paper>
  )
}
