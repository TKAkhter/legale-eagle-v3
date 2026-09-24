import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import UpgradeIcon from "@mui/icons-material/Upgrade"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { ShortMatterFormDrawer } from "./_components/ShortMatterFormDrawer"
import { PromoteShortMatterDrawer } from "./_components/PromoteShortMatterDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true })

export default function ShortMattersPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [promoteRow, setPromoteRow] = useState<Record<string, unknown> | null>(null)

  return (
    <PageShell
      title="Short Matters"
      description="Short-form matters by client"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
          New Short Matter
        </Button>
      }
    >
      <DataGrid
        columns={[
          { field: "title", header: "Matter", sortKey: "title", renderCell: (v, row) => String(v ?? (row as { matterTitle?: string }).matterTitle ?? "—") },
          { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          { field: "openDate", header: "Opened", renderCell: v => String(v || "—") },
        ]}
        queryKey={["matters", "short"]}
        queryFn={(p: GridParams) => miscModulesApi.getShortMatters(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        rowMenuItems={row => [
          {
            label: "Edit",
            icon: <EditIcon fontSize="small" />,
            onClick: () => {
              setEditId(String((row as { id?: string }).id ?? ""))
              setDrawerOpen(true)
            },
          },
          {
            label: "Promote to Long Matter",
            icon: <UpgradeIcon fontSize="small" />,
            onClick: () => setPromoteRow(row as Record<string, unknown>),
          },
        ]}
      />
      <ShortMatterFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        shortMatterId={editId}
        onSuccess={() => {
          setDrawerOpen(false)
          setEditId(undefined)
          qc.invalidateQueries({ queryKey: ["matters", "short"] })
          toast.success(editId ? "Short matter updated" : "Short matter created")
        }}
      />
      <PromoteShortMatterDrawer
        open={!!promoteRow}
        onClose={() => setPromoteRow(null)}
        shortMatter={promoteRow}
        onSuccess={() => {
          setPromoteRow(null)
          qc.invalidateQueries({ queryKey: ["matters", "short"] })
          toast.success("Short matter promoted to long matter")
        }}
      />
    </PageShell>
  )
}
