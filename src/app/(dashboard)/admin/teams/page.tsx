import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { Can } from "@components/ui/Can"
import { AddTeamDrawer } from "./_components/AddTeamDrawer"
import { teamsApi } from "@/api/teams"
import { toast } from "@/lib/toast"
import { PERMISSIONS } from "@config/permissions"
import type { GridParams } from "@/types/common.types"

/** LMS `/teams` — admin all-teams list + create. */
export default function AdminTeamsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <PageShell
      title="Teams"
      description="Manage organisation teams and heads of department"
      action={(
        <Can do={PERMISSIONS.TEAM_MANAGE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
            Add Team
          </Button>
        </Can>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "name", header: "Team" },
          {
            field: "hod",
            header: "HOD",
            renderCell: (v) => {
              const h = v as { firstName?: string; lastName?: string; fullName?: string } | null
              if (!h) return "—"
              return h.fullName || `${h.firstName ?? ""} ${h.lastName ?? ""}`.trim() || "—"
            },
          },
          {
            field: "id",
            header: "",
            renderCell: (_, row) => (
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate(`/admin/teams/${String((row as { id: string }).id)}`)}
              >
                Details
              </Button>
            ),
          },
        ]}
        queryKey={["teams", "all", gridKey]}
        queryFn={(p: GridParams) => teamsApi.getAllTeams(p)}
        emptyState="No teams found."
      />

      <AddTeamDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success("Team added")
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["teams"] })
        }}
      />
    </PageShell>
  )
}
