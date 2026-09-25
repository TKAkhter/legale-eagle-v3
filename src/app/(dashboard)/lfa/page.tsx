import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Paper, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import VisibilityIcon from "@mui/icons-material/Visibility"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import CheckIcon from "@mui/icons-material/Check"
import SendIcon from "@mui/icons-material/Send"
import BlockIcon from "@mui/icons-material/Block"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { Can } from "@components/ui/Can"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { PERMISSIONS } from "@config/permissions"
import { ClientSelectFilter, BillingTypeFilter, DateRangeFilter, FilterActions, MatterSelectFilter, StatusFilter } from "@components/filters"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { lfaApi } from "@/api/lfa"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"
import { LfaFormDrawer } from "./_components/LfaFormDrawer"
import { LfaRatesDialog } from "./_components/LfaRatesDialog"
import { SendForSignatureDialog } from "./_components/SendForSignatureDialog"
import { SendForApprovalDialog } from "./_components/SendForApprovalDialog"
import { useTranslation } from "react-i18next"

function LfaFilterPanel({
  onSearch,
  onReset,
  filters,
  onApplied,
}: FilterPanelProps & { onApplied?: (f: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, unknown>>({ status: "Active", ...filters })
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const billingType = String(f.billingType ?? "")

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <ClientSelectFilter
        value={String(f.clientId ?? "") || undefined}
        onChange={v => {
          set("clientId", v)
          set("matterId", "")
        }}
      />
      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        onChange={v => set("matterId", v ?? "")}
        clientId={String(f.clientId ?? "") || undefined}
      />
      <StatusFilter
        value={String(f.status ?? "Active")}
        onChange={v => set("status", v === "All" ? "" : v)}
        options={[
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Draft", label: "Draft" },
          { value: "Approved", label: "Approved" },
          { value: "Cancel", label: "Canceled" },
        ]}
      />
      <BillingTypeFilter value={billingType} onChange={v => set("billingType", v ?? "")} />
      {billingType === "Fixed" && (
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Retainer</InputLabel>
          <Select label="Retainer" value={String(f.retainer ?? "")} onChange={e => set("retainer", e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Retainer</MenuItem>
          </Select>
        </FormControl>
      )}
      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => {
          const next = { status: "Active" }
          setF(next)
          onApplied?.(next)
          onReset()
        }}
      />
    </Box>
  )
}

function clientLabel(v: unknown): string {
  const c = v as Record<string, string> | null
  if (!c) return "—"
  return c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
}

function billingLabel(row: Record<string, unknown>): string {
  const type = String(row.billingType ?? "")
  const fee = row.fixedFee ?? row.fixedBillingAmount
  if (type === "Fixed" && fee != null) return `${type} (${Number(fee).toLocaleString("en-US")})`
  if (type === "Hourly" && fee != null) return `${type} (Deposit - ${Number(fee).toLocaleString("en-US")})`
  return type || "—"
}

export default function LfaPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string>()
  const [ratesId, setRatesId] = useState<string>()
  const [sigLfa, setSigLfa] = useState<Record<string, unknown> | null>(null)
  const [approvalLfaId, setApprovalLfaId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({ status: "Active" })
  const [gridKey, setGridKey] = useState(0)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <LfaFilterPanel {...props} onApplied={setAppliedFilters} />
    }
  }, [])

  const statsQ = useQuery({
    queryKey: ["lfa", "group-count"],
    queryFn: () => lfaApi.getGroupCounts(),
  })

  const counts = (statsQ.data ?? []) as { billingType?: string; totalCount?: number }[]
  const hourly = Number(counts.find(c => c.billingType === "Hourly")?.totalCount ?? 0)
  const session = Number(counts.find(c => c.billingType === "Session")?.totalCount ?? 0)
  const fixed = Number(counts.find(c => c.billingType === "Fixed")?.totalCount ?? 0)
  const total = hourly + session + fixed

  async function emailExcel() {
    try {
      toast.success(await lfaApi.requestExcel(appliedFilters))
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <PageShell
      title={t("nav.lfa")}
      description={t("pages.lfaDesc")}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>
            Email Excel
          </Button>
          <Can do={PERMISSIONS.LFA_CREATE}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
              New LFA
            </Button>
          </Can>
        </Box>
      )}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2 }}>
        {[
          { label: "Total LFAs", value: total },
          { label: "Hourly", value: hourly },
          { label: "Session", value: session },
          { label: "Fixed", value: fixed },
        ].map(s => (
          <Paper key={s.label} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      <DataGrid
        key={gridKey}
        columns={[
          { field: "agreementNo", header: "Agreement No.", minWidth: 130 },
          { field: "scope", header: "LFA Scope", renderCell: v => String(v || "—"), minWidth: 120 },
          {
            field: "client",
            header: "Client",
            renderCell: (v, row) => clientLabel(v ?? (row as Record<string, unknown>).clients),
            minWidth: 160,
          },
          {
            field: "billingType",
            header: "Billing Type",
            renderCell: (_v, row) => billingLabel(row as Record<string, unknown>),
            minWidth: 160,
          },
          {
            field: "lfaStatus",
            header: "Status",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const status = String(v ?? (r.current ? "Active" : "Draft"))
              return <StatusBadge status={status} />
            },
          },
          { field: "matterCount", header: "Matters", align: "right", renderCell: v => String(v ?? 0) },
          { field: "addedByName", header: "Created By", renderCell: v => String(v || "—") },
          {
            field: "createdAt",
            header: "Created On",
            renderCell: v => {
              if (v == null || v === "") return "—"
              const n = Number(v)
              if (Number.isFinite(n) && n > 1e9) return formatDate(new Date(n * 1000).toISOString())
              return formatDate(String(v))
            },
          },
          { field: "agreementDate", header: "Agreement Date", renderCell: v => v ? formatDate(String(v)) : "—" },
          {
            field: "matterNos",
            header: "Matter Nos",
            renderCell: v => {
              const arr = Array.isArray(v) ? v : []
              if (!arr.length) return "—"
              return (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {arr.slice(0, 3).map((m, i) => <Chip key={i} size="small" label={String(m)} />)}
                  {arr.length > 3 && <Chip size="small" label={`+${arr.length - 3}`} />}
                </Box>
              )
            },
          },
          {
            field: "fixedBillingAmount",
            header: "Fixed Amt",
            align: "right",
            renderCell: v => v != null ? formatCurrency(Number(v)) : "—",
          },
        ]}
        queryKey={["lfa", "list"]}
        queryFn={(p: GridParams) => lfaApi.getAll({ ...p, filters: { status: "Active", ...p.filters } })}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        detailPath={row => `/lfa/${String((row as { id?: string }).id ?? "")}`}
        defaultSortBy="createdAt"
        defaultSortDir="desc"
        defaultPageSize={10}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          const status = String(r.lfaStatus ?? "")
          const billingType = String(r.billingType ?? "")
          const isDraft = status === "Draft" || status === "Approve"
          const isApproved = status === "Approved" || status === "Active"
          const canCancel = status === "Draft" || status === "Approve"
          return [
            { label: "View", icon: <VisibilityIcon fontSize="small" />, onClick: () => navigate(`/lfa/${id}`) },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              permission: PERMISSIONS.LFA_EDIT,
              hidden: () => status === "Approved" || status === "Cancel" || status === "Canceled",
              onClick: () => {
                if (status === "Approved") {
                  toast.info("LFA already approved — use Amend instead.")
                  return
                }
                setEditId(id)
                setDrawerOpen(true)
              },
            },
            {
              label: "Approve",
              icon: <CheckIcon fontSize="small" />,
              permission: PERMISSIONS.LFA_APPROVE,
              hidden: () => status !== "Draft",
              onClick: async () => {
                try {
                  toast.success(await lfaApi.approve(id, "Approved"))
                  setGridKey(k => k + 1)
                  qc.invalidateQueries({ queryKey: ["lfa"] })
                } catch { toast.error("Approve failed") }
              },
            },
            {
              label: "Send for Approval",
              icon: <SendIcon fontSize="small" />,
              hidden: () => status !== "Draft",
              onClick: () => setApprovalLfaId(id),
            },
            {
              label: "Cancel",
              icon: <CancelOutlinedIcon fontSize="small" />,
              hidden: () => !canCancel,
              onClick: () => setCancelId(id),
            },
            {
              label: "Amend",
              hidden: () => !isApproved,
              onClick: () => {
                if (status === "Draft") {
                  toast.info("LFA isn't approved yet — edit it instead.")
                  return
                }
                navigate(`/lfa/${id}/amend`)
              },
            },
            {
              label: "Partial Amend",
              hidden: () => !isApproved,
              onClick: () => {
                if (status === "Draft") {
                  toast.info("LFA isn't approved yet — edit it instead.")
                  return
                }
                navigate(`/lfa/${id}/partial-amend`)
              },
            },
            {
              label: "View Rates",
              hidden: () => billingType === "Fixed",
              onClick: () => {
                if (billingType === "Fixed") {
                  toast.info("This LFA is Fixed type.")
                  return
                }
                setRatesId(id)
              },
            },
            {
              label: "Toggle Active",
              icon: <BlockIcon fontSize="small" />,
              onClick: async () => {
                try {
                  toast.success(await lfaApi.setInactive(id))
                  setGridKey(k => k + 1)
                  qc.invalidateQueries({ queryKey: ["lfa"] })
                } catch { toast.error("Status update failed") }
              },
            },
            {
              label: "Send for Signature",
              hidden: () => !isDraft && !isApproved,
              onClick: () => setSigLfa(r),
            },
          ]
        }}
      />

      <LfaFormDrawer
        open={drawerOpen}
        lfaId={editId}
        onClose={() => { setDrawerOpen(false); setEditId(undefined) }}
        onSuccess={() => { setGridKey(k => k + 1); qc.invalidateQueries({ queryKey: ["lfa", "list"] }) }}
      />
      <LfaRatesDialog open={!!ratesId} lfaId={ratesId} onClose={() => setRatesId(undefined)} />
      {sigLfa && (
        <SendForSignatureDialog
          open={!!sigLfa}
          onClose={() => setSigLfa(null)}
          lfa={sigLfa}
          onSent={() => setSigLfa(null)}
        />
      )}
      {approvalLfaId && (
        <SendForApprovalDialog
          open
          lfaId={approvalLfaId}
          onClose={() => setApprovalLfaId(null)}
          onSent={() => {
            setApprovalLfaId(null)
            setGridKey(k => k + 1)
            qc.invalidateQueries({ queryKey: ["lfa"] })
          }}
        />
      )}
      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={async () => {
          toast.success(await lfaApi.approve(String(cancelId), "Cancel"))
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["lfa"] })
        }}
        title="Cancel LFA"
        message="Do you want to cancel this LFA?"
        confirmLabel="Cancel LFA"
        severity="warning"
      />
    </PageShell>
  )
}
