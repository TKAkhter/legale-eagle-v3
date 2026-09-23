import { useMemo } from "react"
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom"
import { Button, Paper, Tab, Tabs } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { teamsApi } from "@/api/teams"
import { useState } from "react"
import type { GridParams } from "@/types/common.types"

export default function TeamMemberPage() {
  const { memberId = "" } = useParams()
  const [params] = useSearchParams()
  const teamId = params.get("teamId") ?? ""
  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("teamMember") ?? "{}") as { name?: string } }
    catch { return {} }
  }, [])
  const [tab, setTab] = useState(0)
  const taskStatus = tab === 1 ? "Pending" : tab === 2 ? "Completed" : tab === 3 ? "Re_Submit" : ""

  return (
    <PageShell
      title={stored.name ?? "Team Member"}
      description={`Member ${memberId}`}
      breadcrumbs={[
        { label: "My Teams", path: "/team" },
        ...(teamId ? [{ label: "Hierarchy", path: `/team/${teamId}` }] : []),
        { label: stored.name ?? memberId },
      ]}
    >
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1 }}>
          <Tab label="Matters" />
          <Tab label="Pending Tasks" />
          <Tab label="Completed Tasks" />
          <Tab label="Re-Submit Tasks" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <DataGrid
          columns={[
            { field: "title", header: "Matter", renderCell: (v, row) => (
              <Button component={RouterLink} to={`/matters/${String((row as { id: string }).id)}`} size="small" sx={{ textTransform: "none" }}>
                {String(v ?? "—")}
              </Button>
            )},
            { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
            { field: "billingType", header: "Billing" },
          ]}
          queryKey={["teams", "member", memberId, "matters"]}
          queryFn={(p: GridParams) => teamsApi.getMemberMatters(memberId, p)}
        />
      ) : (
        <DataGrid
          columns={[
            { field: "title", header: "Task" },
            { field: "taskStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
            { field: "dueDate", header: "Due" },
          ]}
          queryKey={["teams", "member", memberId, "tasks", taskStatus]}
          queryFn={(p: GridParams) => teamsApi.getMemberTasks(memberId, taskStatus, p)}
        />
      )}
    </PageShell>
  )
}
