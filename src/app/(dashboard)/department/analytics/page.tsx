/**
 * Department Analytics dashboard — separate from the main project Dashboard.
 * Old LMS route: /department/analytics
 */
import { Box, Paper, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { dashboardApi } from "@/api/dashboard"

export default function DepartmentAnalyticsPage() {
  const setup = useQuery({
    queryKey: ["dashboard", "setup"],
    queryFn: () => dashboardApi.getSetup(),
    staleTime: 5 * 60_000,
  })
  const leadCount = useQuery({ queryKey: ["dashboard", "lead-count"], queryFn: () => dashboardApi.leadCount() })
  const matterCount = useQuery({ queryKey: ["dashboard", "matter-count"], queryFn: () => dashboardApi.matterCount() })

  return (
    <PageShell
      title="Department Analytics"
      description="Analytics overview for your department"
    >
      {setup.isLoading ? (
        <PanelLoader label="Loading analytics…" />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Open Leads</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{leadCount.data?.openCount ?? "—"}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Open Matters</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{matterCount.data?.open ?? "—"}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Closed Matters</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{matterCount.data?.close ?? "—"}</Typography>
          </Paper>
        </Box>
      )}
    </PageShell>
  )
}
