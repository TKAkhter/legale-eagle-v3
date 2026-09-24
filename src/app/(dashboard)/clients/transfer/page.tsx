import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Button, Tab, Tabs } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { TransferFormDrawer } from "./_components/TransferFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function ClientTransferPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const status = tab === 0 ? "pending" : "completed"

  return (
    <PageShell
      title="Client Transfer"
      description="Transfer matters and data between clients"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Transfer
        </Button>
      }
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Pending" />
          <Tab label="Completed" />
        </Tabs>
      </Box>
      <DataGrid
        key={status}
        columns={[
          { field: "fromClientName", header: "From Client", renderCell: (v, row) => String(v ?? (row as { fromObjectName?: string }).fromObjectName ?? "—") },
          { field: "toClientName", header: "To Client", renderCell: (v, row) => String(v ?? (row as { toObjectName?: string }).toObjectName ?? "—") },
          { field: "status", header: "Status", renderCell: v => String(v || "—") },
          { field: "createdAt", header: "Created", renderCell: v => String(v || "—") },
        ]}
        queryKey={["transfers", status]}
        queryFn={(p: GridParams) => miscModulesApi.getTransfers(p, status)}
        zebraStriping
      />
      <TransferFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false)
          qc.invalidateQueries({ queryKey: ["transfers"] })
          toast.success("Transfer created")
        }}
      />
    </PageShell>
  )
}
