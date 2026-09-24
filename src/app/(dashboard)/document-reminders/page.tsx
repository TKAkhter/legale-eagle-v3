import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { DocumentReminderFormDrawer } from "./_components/DocumentReminderFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function DocumentRemindersPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)

  return (
    <PageShell
      title="Document Reminders"
      description="Reminders for matter and client documents"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditRow(null); setDrawerOpen(true) }}>
          New Reminder
        </Button>
      }
    >
      <DataGrid
        columns={[
          { field: "documentName", header: "Document", renderCell: (v, row) => String(v ?? (row as { name?: string }).name ?? "—") },
          { field: "issueDate", header: "Issue Date", renderCell: v => String(v || "—") },
          { field: "expDate", header: "Expiry", renderCell: (v, row) => String(v ?? (row as { reminderDate?: string }).reminderDate ?? "—") },
          { field: "reminderBefore", header: "Remind Before (days)", renderCell: v => String(v ?? "—") },
          { field: "status", header: "Status", renderCell: v => String(v || "—") },
        ]}
        queryKey={["document-reminders"]}
        queryFn={(p: GridParams) => miscModulesApi.getDocumentReminders(p)}
        zebraStriping
        rowMenuItems={row => [
          {
            label: "Edit",
            icon: <EditIcon fontSize="small" />,
            onClick: () => { setEditRow(row as Record<string, unknown>); setDrawerOpen(true) },
          },
        ]}
      />
      <DocumentReminderFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditRow(null) }}
        reminder={editRow}
        onSuccess={() => {
          setDrawerOpen(false)
          setEditRow(null)
          qc.invalidateQueries({ queryKey: ["document-reminders"] })
          toast.success(editRow ? "Reminder updated" : "Reminder created")
        }}
      />
    </PageShell>
  )
}
