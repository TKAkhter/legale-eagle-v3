/**
 * LFA Approvals — dual queue (OLD parity):
 * - Approval → GET /api/lfa/approval/list  (OLD /LFAs-approval)
 * - Pending  → GET /api/lfa/pending/approval (OLD /pending/approval)
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Button, Tab, Tabs } from "@mui/material"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { useTranslation } from "react-i18next"
import { BillingTypeFilter } from "@components/filters/BillingTypeFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { lfaApi } from "@/api/lfa"
import { PERMISSIONS } from "@config/permissions"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"

type TabKey = "approval" | "pending"

function clientLabel(v: unknown): string {
  const c = v as Record<string, string> | null | undefined
  if (!c) return "—"
  return c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
}

function ApprovalFilter({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter value={String(f.clientId ?? "") || undefined} onChange={v => set("clientId", v)} />
      <BillingTypeFilter value={String(f.billingType ?? "")} onChange={v => set("billingType", v ?? "")} />
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Fetch</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

export default function LfaApprovalPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>("approval")
  const [gridKey, setGridKey] = useState(0)

  async function handleAction(row: Record<string, unknown>, status: string) {
    try {
      toast.success(await lfaApi.approve(String(row.id), status))
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["lfa", "approval"] })
    } catch {
      toast.error("Action failed")
    }
  }

  return (
    <PageShell title={t("nav.approvals-lfa")} description={t("pages.lfaApprovalsDesc")}>
      <Tabs
        value={tab}
        onChange={(_, v: TabKey) => { setTab(v); setGridKey(k => k + 1) }}
        sx={{ mb: 2 }}
      >
        <Tab label="Approval" value="approval" />
        <Tab label="Pending" value="pending" />
      </Tabs>

      <DataGrid
        key={`${tab}-${gridKey}`}
        columns={[
          { field: "agreementNo", header: "Agreement #" },
          {
            field: "client",
            header: "Client",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              return clientLabel(v ?? r.clients ?? r.client)
            },
          },
          { field: "lfaTitle", header: "Title", renderCell: v => String(v || "—") },
          { field: "billingType", header: "Type", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
          {
            field: "fixedBillingAmount",
            header: "Amount",
            align: "right",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const amt = v ?? r.fixedFee
              return amt != null && amt !== "" ? formatCurrency(Number(amt)) : "—"
            },
          },
          { field: "agreementDate", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          {
            field: "lfaStatus",
            header: "Status",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              return <StatusBadge status={String(v ?? r.status ?? "Pending_Approval")} />
            },
          },
        ]}
        queryKey={["lfa", "approval", tab]}
        queryFn={(p: GridParams) =>
          tab === "approval" ? lfaApi.getApprovalList(p) : lfaApi.getPendingApproval(p)
        }
        FilterPanel={tab === "pending" ? ApprovalFilter : undefined}
        hasFilters={tab === "pending"}
        detailPath={row => `/lfa/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          return [
            {
              label: "View",
              icon: <VisibilityIcon fontSize="small" />,
              onClick: () => navigate(`/lfa/${String(r.id)}`),
            },
            {
              label: "Approve",
              icon: <CheckIcon fontSize="small" />,
              permission: PERMISSIONS.LFA_APPROVE,
              onClick: () => handleAction(r, "Approved"),
            },
            {
              label: "Reject",
              icon: <CloseIcon fontSize="small" />,
              permission: PERMISSIONS.LFA_APPROVE,
              color: "error",
              // OLD approval OptionsMenu uses "Cancel"; keep that status for both queues
              onClick: () => handleAction(r, "Cancel"),
            },
          ]
        }}
      />
    </PageShell>
  )
}
