import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { DocumentReminderFormDrawer } from "./_components/DocumentReminderFormDrawer"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

function remindTo(row: Record<string, unknown>): string {
  if (Array.isArray(row.remindPersonName)) return row.remindPersonName.map(String).join(", ") || "—"
  if (Array.isArray(row.remindTo)) return row.remindTo.map(String).join(", ") || "—"
  return text(row.remindTo)
}

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
          { field: "documentName", header: "Document Name", renderCell: (v, row) => text(v ?? (row as { name?: string }).name) },
          {
            field: "issueDate",
            header: "Issue Date",
            width: 120,
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "expDate",
            header: "Expire Date",
            width: 120,
            renderCell: (v, row) => {
              const d = v ?? (row as { reminderDate?: string }).reminderDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "reminderBefore",
            header: "Reminder Period",
            width: 130,
            renderCell: v => text(v),
          },
          {
            field: "reminderDate",
            header: "Reminder Date",
            width: 130,
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "remindTo",
            header: "Remind To",
            renderCell: (_v, row) => remindTo(row as Record<string, unknown>),
          },
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
