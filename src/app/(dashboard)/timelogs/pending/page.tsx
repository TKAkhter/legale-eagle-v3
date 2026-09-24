/**
 * Pending timelog approvals browser — LMS `/pending-approval-timelogs` (browse + Email Excel, no approve).
 */
import { useMemo, useState } from "react"
import { Button } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { timelogsApi } from "@/api/timelogs"
import type { GridParams } from "@/types/common.types"

const BaseFilterPanel = makeReportFilterPanel({
  showClient: true,
  showMatter: true,
  showDateRange: true,
  showUser: true,
})

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

export default function TimelogsPendingPage() {
  const [emailing, setEmailing] = useState(false)
  const [lastFilters, setLastFilters] = useState<Record<string, unknown>>({})

  const FilterPanel = useMemo(() => {
    return function PendingFilter(props: {
      onSearch: (f: Record<string, unknown>) => void
      onReset: () => void
      filters: Record<string, unknown>
    }) {
      return (
        <BaseFilterPanel
          {...props}
          onSearch={f => {
            setLastFilters(f)
            props.onSearch(f)
          }}
          onReset={() => {
            setLastFilters({})
            props.onReset()
          }}
        />
      )
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await timelogsApi.requestPendingExcel({
        clientId: lastFilters.clientId ?? "",
        matterId: lastFilters.matterId ?? "",
        responsiblePerson: lastFilters.userId ?? "",
        startDate: lastFilters.fromDate ?? "",
        endDate: lastFilters.toDate ?? "",
      }))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Pending Timelog Approvals"
      description="Browse hourly time entries awaiting approval"
      action={(
        <Button
          size="small"
          variant="outlined"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={[
          { field: "entryDate", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          { field: "activity", header: "Activity", renderCell: (v, row) => String(v ?? (row as { activityName?: string }).activityName ?? "—") },
          { field: "matterTitle", header: "Matter", renderCell: (v, row) => String(v ?? (row as { matter?: { title?: string } }).matter?.title ?? "—") },
          { field: "clientName", header: "Client", renderCell: (v, row) => String(v ?? (row as { client?: { companyName?: string } }).client?.companyName ?? "—") },
          {
            field: "agreementNo",
            header: "Agreement",
            renderCell: (v, row) => String(v ?? (row as { lfaNo?: string }).lfaNo ?? "—"),
          },
          {
            field: "totalHours",
            header: "Hours",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              if (r.totalHours != null) return Number(r.totalHours).toFixed(2)
              const h = Number(r.hours ?? 0)
              const m = Number(r.minutes ?? 0)
              return h || m ? `${h}:${String(m).padStart(2, "0")}` : "0"
            },
          },
          { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
          { field: "responsiblePerson", header: "User", renderCell: v => personName(v) },
          {
            field: "approverName",
            header: "Approver",
            renderCell: (v, row) => personName(v ?? (row as { approver?: unknown }).approver),
          },
          { field: "revenueStatus", header: "Status", renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { status?: string }).status ?? "Pending")} /> },
        ]}
        queryKey={["timelogs", "pending"]}
        queryFn={(p: GridParams) => timelogsApi.getPendingApproval(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
      />
    </PageShell>
  )
}
