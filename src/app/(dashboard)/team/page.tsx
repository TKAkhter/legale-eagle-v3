import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { teamsApi } from "@/api/teams"
import { Button, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import type { GridParams } from "@/types/common.types"

export default function MyTeamsPage() {
  const navigate = useNavigate()
  return (
    <PageShell title="My Teams" description="Organisation teams you belong to">
      <DataGrid
        columns={[
          { field: "name", header: "Team" },
          {
            field: "hod",
            header: "HOD",
            renderCell: (v) => {
              const h = v as { firstName?: string; lastName?: string } | null
              return h ? `${h.firstName ?? ""} ${h.lastName ?? ""}`.trim() || "—" : "—"
            },
          },
          {
            field: "id",
            header: "",
            renderCell: (_, row) => (
              <Button size="small" variant="contained" onClick={() => navigate(`/team/${String((row as { id: string }).id)}`)}>
                Details
              </Button>
            ),
          },
        ]}
        queryKey={["teams", "my"]}
        queryFn={(p: GridParams) => teamsApi.getMyTeams(p)}
        emptyState={<Typography color="text.secondary">No teams found.</Typography>}
      />
    </PageShell>
  )
}
