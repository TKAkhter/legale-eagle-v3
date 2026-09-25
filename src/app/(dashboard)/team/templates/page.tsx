import { useState } from "react"
import { Box, Button, Chip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { TeamTemplateFormDrawer } from "./_components/TeamTemplateFormDrawer"
import { teamTemplatesApi } from "@/api/teamTemplates"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function TeamTemplatesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)

  function refresh() {
    qc.invalidateQueries({ queryKey: ["team-templates"] })
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title="Team Templates"
      description="Reusable matter team staffing templates"
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
          New Template
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "name", header: "Name" },
          { field: "description", header: "Description", renderCell: v => String(v || "—") },
          {
            field: "users",
            header: "Members",
            renderCell: (v) => {
              const list = (v as { userName?: string; teamRoleName?: string }[]) ?? []
              if (!list.length) return "—"
              return (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {list.slice(0, 3).map((m, i) => (
                    <Chip key={i} size="small" label={m.userName ?? m.teamRoleName ?? "Member"} variant="outlined" />
                  ))}
                  {list.length > 3 && <Chip size="small" label={`+${list.length - 3}`} />}
                </Box>
              )
            },
          },
        ]}
        queryKey={["team-templates", "list"]}
        queryFn={(p: GridParams) => teamTemplatesApi.getAll(p)}
        zebraStriping
        detailPath={(row) => `/team/templates/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={(row) => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            { label: "Details", onClick: () => navigate(`/team/templates/${id}`) },
            { label: "Edit", onClick: () => { setEditId(id); setDrawerOpen(true) } },
            { label: "Delete", onClick: () => setDeleteId(id), color: "error" },
          ]
        }}
      />
      <TeamTemplateFormDrawer
        open={drawerOpen}
        templateId={editId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={refresh}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Team Template"
        message="Are you sure you want to delete this team template? This cannot be undone."
        confirmLabel="Delete"
        severity="error"
        onConfirm={async () => {
          if (!deleteId) return
          try {
            toast.success(await teamTemplatesApi.delete(deleteId))
            refresh()
          } catch (e: unknown) {
            toast.error((e as { message?: string })?.message ?? "Failed to delete team template")
          }
        }}
      />
    </PageShell>
  )
}
