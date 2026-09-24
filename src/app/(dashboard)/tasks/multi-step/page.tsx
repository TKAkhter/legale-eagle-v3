import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { MultiStepTaskFormDrawer } from "./_components/MultiStepTaskFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function MultiStepTasksPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <PageShell
      title="Multi-Step Tasks"
      description="Templates and checklists with multiple steps"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Multi-Step Task
        </Button>
      }
    >
      <DataGrid
        columns={[
          { field: "taskName", header: "Task", sortKey: "taskName", renderCell: (v, row) => String(v ?? (row as { name?: string }).name ?? "—") },
          { field: "taskStatus", header: "Status", renderCell: v => String(v || "—") },
          { field: "steps", header: "Steps", align: "right", renderCell: (v, row) => String(v ?? ((row as { subTasks?: unknown[] }).subTasks?.length) ?? "—") },
          { field: "createdAt", header: "Created", renderCell: v => String(v || "—") },
        ]}
        queryKey={["tasks", "multi-step"]}
        queryFn={(p: GridParams) => miscModulesApi.getMultiStepTasks(p)}
        zebraStriping
      />
      <MultiStepTaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false)
          qc.invalidateQueries({ queryKey: ["tasks", "multi-step"] })
          toast.success("Multi-step task created")
        }}
      />
    </PageShell>
  )
}
