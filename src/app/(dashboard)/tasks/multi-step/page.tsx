import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { MultiStepTaskFormDrawer } from "./_components/MultiStepTaskFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function MultiStepTasksPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const rawType = sp.get("type")?.toUpperCase()
  const taskType = rawType === "CLIENT" || rawType === "MATTER" ? rawType : undefined
  const taskTypeId = sp.get("typeId")?.trim() || undefined

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
          {
            field: "taskName",
            header: "Task",
            sortKey: "taskName",
            renderCell: (v, row) => String(v ?? (row as { name?: string; title?: string }).name ?? (row as { title?: string }).title ?? "—"),
          },
          {
            field: "taskStatus",
            header: "Status",
            width: 120,
            renderCell: v => <StatusBadge status={String(v || "—")} />,
          },
          {
            field: "assignPersonName",
            header: "Assignee",
            renderCell: (v, row) => {
              const a = (row as Record<string, unknown>).assignPerson
              if (typeof a === "object" && a) {
                const o = a as { firstName?: string; lastName?: string }
                return `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || "—"
              }
              return String(v || a || "—")
            },
          },
          {
            field: "steps",
            header: "Steps",
            align: "right",
            width: 90,
            renderCell: (v, row) => String(v ?? ((row as { subTasks?: unknown[] }).subTasks?.length) ?? "—"),
          },
          {
            field: "taskDeadLine",
            header: "Deadline",
            width: 120,
            renderCell: (v, row) => {
              const d = v || (row as Record<string, unknown>).dueDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "createdAt",
            header: "Created",
            width: 120,
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
        ]}
        queryKey={["tasks", "multi-step"]}
        queryFn={(p: GridParams) => miscModulesApi.getMultiStepTasks(p)}
        zebraStriping
        detailPath={row => `/tasks/${String((row as { id?: string; uuid?: string }).id ?? (row as { uuid?: string }).uuid ?? "")}`}
        rowMenuItems={row => {
          const id = String((row as { id?: string; uuid?: string }).id ?? (row as { uuid?: string }).uuid ?? "")
          return [
            { label: "Open", onClick: () => navigate(`/tasks/${id}`) },
          ]
        }}
      />
      <MultiStepTaskFormDrawer
        open={drawerOpen}
        taskType={taskType}
        taskTypeId={taskTypeId}
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
