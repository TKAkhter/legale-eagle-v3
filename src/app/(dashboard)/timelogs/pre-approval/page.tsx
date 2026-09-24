import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import SendIcon from "@mui/icons-material/Send"
import UndoIcon from "@mui/icons-material/Undo"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import { PERMISSIONS } from "@config/permissions"
import { TimelogQueueFilter } from "../_components/TimelogQueueFilter"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function personName(v: unknown): string {
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function clientName(v: unknown): string {
  const c = v as Record<string, string> | null
  return c?.companyName || `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim() || "—"
}

export default function TimelogsPreApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const actingHodRef = useRef("")

  async function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["timelogs"] })
  }

  function FilterPanel(props: FilterPanelProps) {
    return (
      <TimelogQueueFilter
        {...props}
        showActingHod
        onSearch={f => {
          actingHodRef.current = String(f.actingHodUserId ?? "")
          props.onSearch(f)
        }}
      />
    )
  }

  return (
    <PageShell
      title="Timelogs Pre-Approval"
      description="Draft time entries — send for attorney approval or undo draft"
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "client", header: "Client", renderCell: v => clientName(v), minWidth: 140 },
          { field: "activity", header: "Description", renderCell: (v, row) => String(v || (row as Record<string, unknown>).note || "—"), minWidth: 160 },
          { field: "responsiblePerson", header: "Lawyer", renderCell: v => personName(v) },
          { field: "totalHours", header: "Hours", align: "right", renderCell: v => Number(v ?? 0).toFixed(2) },
          { field: "unit", header: "Unit", align: "right", renderCell: v => String(v ?? "—") },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "entryDate", header: "Entry Date", renderCell: v => formatDate(String(v ?? "")) },
          { field: "matter", header: "Matter", renderCell: v => (v as Record<string, string>)?.title ?? "—" },
          { field: "agreementNo", header: "Agreement No.", renderCell: v => String(v || "—") },
          { field: "lfaBillingType", header: "LFA Type", renderCell: v => <StatusBadge status={String(v || "—")} /> },
          { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
        ]}
        queryKey={["timelogs", "preApproval"]}
        queryFn={(p: GridParams) => timelogsApi.getDrafts(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        hasRowSelection
        defaultSortBy="entryDate"
        defaultSortDir="desc"
        bulkActions={[
          {
            label: "Send for Approval",
            icon: <SendIcon fontSize="small" />,
            onClick: async (rows) => {
              try {
                const ids = rows.map(r => String((r as { id?: string }).id ?? "")).filter(Boolean)
                if (ids.length > 15) {
                  toast.error("Select at most 15 entries")
                  return
                }
                toast.success(await timelogsApi.sendForApproval(ids, actingHodRef.current || undefined))
                await refresh()
              } catch {
                toast.error("Failed to send for approval")
              }
            },
          },
          {
            label: "Undo Draft",
            icon: <UndoIcon fontSize="small" />,
            onClick: async (rows) => {
              try {
                const ids = rows.map(r => String((r as { id?: string }).id ?? "")).filter(Boolean)
                if (ids.length > 15) {
                  toast.error("Select at most 15 entries")
                  return
                }
                toast.success(await timelogsApi.undoDraft(ids))
                await refresh()
              } catch {
                toast.error("Failed to undo draft")
              }
            },
          },
        ]}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          return [
            {
              label: "Submit for Approval",
              icon: <SendIcon fontSize="small" />,
              permission: PERMISSIONS.TIMELOGS_APPROVE,
              onClick: async () => {
                try {
                  toast.success(await timelogsApi.sendForApproval([id], actingHodRef.current || undefined))
                  await refresh()
                } catch {
                  toast.error("Failed to submit")
                }
              },
            },
            {
              label: "Undo Draft",
              icon: <UndoIcon fontSize="small" />,
              onClick: async () => {
                try {
                  toast.success(await timelogsApi.undoDraft([id]))
                  await refresh()
                } catch {
                  toast.error("Failed to undo draft")
                }
              },
            },
          ]
        }}
      />
    </PageShell>
  )
}
