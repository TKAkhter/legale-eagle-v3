/**
 * Closed Matters report — LMS `/closed/matters` parity (new UI).
 * Search: POST keySearch; list: GET close/form/list.
 * Row actions: Re-Open, Details. Columns match OLD closed-matters List.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Link, Typography } from "@mui/material"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { FilterActions, SearchInput } from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps, RowMenuItem } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function clientOf(row: Record<string, unknown>): { id: string; name: string } {
  const mini = row.matterMini as {
    clientMini?: Record<string, unknown> & {
      client?: Record<string, unknown>
    }
  } | null
  const nested = mini?.clientMini?.client
  const c = (nested ?? mini?.clientMini ?? row.clientMini ?? null) as Record<string, unknown> | null
  const id = String(
    row.clientId
    ?? mini?.clientMini?.clientId
    ?? mini?.clientMini?.id
    ?? c?.clientId
    ?? c?.id
    ?? "",
  )
  if (!c) {
    return { id, name: String(row.clientName ?? "—") }
  }
  if (String(c.clientType ?? "") === "COMPANY" || c.companyName) {
    return { id, name: String(c.companyName || c.name || "—") }
  }
  const name = `${String(c.firstName ?? "")} ${String(c.lastName ?? "")}`.trim()
  return { id, name: name || String(c.name || "—") }
}

function matterOf(row: Record<string, unknown>): { id: string; title: string } {
  const mini = row.matterMini as { matterId?: string; id?: string; title?: string } | null
  return {
    id: String(row.matterId ?? mini?.matterId ?? mini?.id ?? ""),
    title: String(row.matterTitle ?? mini?.title ?? "—"),
  }
}

function matterScope(row: Record<string, unknown>): string {
  const mini = row.matterMini as { description?: string } | null
  return String(row.matterScope ?? mini?.description ?? "—")
}

function closedBy(row: Record<string, unknown>): string {
  const mini = row.matterMini as { closeByName?: string } | null
  return String(row.closeByName ?? mini?.closeByName ?? row.closedBy ?? "—")
}

function safeDate(v: unknown): string {
  if (!v || String(v) === "Invalid date") return "—"
  return formatDate(String(v))
}

function money(v: unknown): string {
  if (v == null || v === "") return "—"
  return formatCurrency(Number(v))
}

function ClosedMattersFilters({
  onSearch,
  onReset,
  filters,
}: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <SearchInput
        value={String(f.keySearch ?? "")}
        onChange={v => set("keySearch", v)}
        placeholder="Search closed matters..."
      />
      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => {
          setF({})
          onReset()
        }}
      />
    </Box>
  )
}

export default function ClosedMattersReportPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "matter",
      header: "Matter Number",
      minWidth: 180,
      renderCell: (_v, row) => {
        const { id, title } = matterOf(row)
        if (!id) return title
        return (
          <Link
            component={RouterLink}
            to={`/matters/${id}`}
            underline="hover"
            onClick={e => e.stopPropagation()}
          >
            {title}
          </Link>
        )
      },
    },
    {
      field: "client",
      header: "Client Name",
      minWidth: 160,
      renderCell: (_v, row) => {
        const { id, name } = clientOf(row)
        if (!id) return name
        return (
          <Link
            component={RouterLink}
            to={`/clients/${id}`}
            underline="hover"
            onClick={e => e.stopPropagation()}
          >
            {name}
          </Link>
        )
      },
    },
    {
      field: "matterScope",
      header: "Matter Scope",
      minWidth: 160,
      renderCell: (_v, row) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
          {matterScope(row)}
        </Typography>
      ),
    },
    {
      field: "closeDate",
      header: "Close Date",
      renderCell: v => safeDate(v),
    },
    { field: "fileNo", header: "File No", renderCell: v => String(v || "—") },
    { field: "fileTitle", header: "File Title", renderCell: v => String(v || "—") },
    {
      field: "responsibleAttorneyName",
      header: "Responsible Attorney",
      renderCell: v => String(v || "—"),
    },
    {
      field: "finalResponsibleAttorneyName",
      header: "Final Responsible Attorney",
      renderCell: v => String(v || "—"),
    },
    {
      field: "materialReturnToClient",
      header: "Materials Returned to Client",
      renderCell: v => String(v || "—"),
    },
    {
      field: "retainedMaterial",
      header: "Materials To Be Retained",
      renderCell: v => String(v || "—"),
    },
    {
      field: "destroyedMaterial",
      header: "Materials To Be Destroyed",
      renderCell: v => String(v || "—"),
    },
    {
      field: "materialReceivedDate",
      header: "Materials Received from Client Date",
      renderCell: (_v, row) => {
        const raw = row.materialReceivedDate
        return safeDate(raw === "Invalid date" ? "" : raw)
      },
    },
    { field: "note", header: "Notes", renderCell: v => String(v || "—") },
    {
      field: "outstandingFees",
      header: "Outstanding Fees",
      align: "right",
      renderCell: v => money(v),
    },
    {
      field: "outstandingCosts",
      header: "Outstanding Cost",
      align: "right",
      renderCell: v => money(v),
    },
    {
      field: "remainingFundInTrust",
      header: "Refund Remaining in Trust Account",
      align: "right",
      renderCell: v => money(v),
    },
    {
      field: "closeByName",
      header: "Closed By",
      renderCell: (_v, row) => closedBy(row),
    },
  ], [])

  const rowMenuItems = (row: Record<string, unknown>): RowMenuItem<Record<string, unknown>>[] => [
    {
      label: "Re-Open",
      icon: <LockOpenIcon fontSize="small" />,
      onClick: async (r) => {
        const formId = String(r.id ?? "")
        const matterId = matterOf(r).id
        if (!formId) {
          toast.error("Missing closed form id")
          return
        }
        try {
          toast.success(await reportsApi.reopenClosedForm(formId))
          void qc.invalidateQueries({ queryKey: ["reports", "closed-matters"] })
          setGridKey(k => k + 1)
          if (matterId) navigate(`/matters/${matterId}`)
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to reopen matter")
        }
      },
    },
    {
      label: "Details",
      icon: <InfoOutlinedIcon fontSize="small" />,
      onClick: (r) => {
        const matterId = matterOf(r).id
        if (!matterId) {
          toast.error("Missing matter id")
          return
        }
        navigate(`/matters/${matterId}`)
      },
    },
  ]

  return (
    <PageShell
      title="Closed Matters"
      description="Closed matter forms — search, reopen, and review details"
    >
      <DataGrid
        key={gridKey}
        columns={columns}
        queryKey={["reports", "closed-matters"]}
        queryFn={(p: GridParams) => reportsApi.getClosedMatters(p)}
        FilterPanel={ClosedMattersFilters}
        hasFilters
        syncWithUrl
        rowMenuItems={rowMenuItems}
        zebraStriping
      />
    </PageShell>
  )
}
