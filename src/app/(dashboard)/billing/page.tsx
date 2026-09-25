/**
 * Generate Bill — LMS `/billing` (Hourly / Session / Fixed unbilled → invoice).
 */
import { useMemo, useState } from "react"
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from "@mui/material"
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { InvoiceFormDrawer, type InvoiceFormPrefill } from "../billings/_components/InvoiceFormDrawer"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import type { ColumnDef } from "@components/data-grid/types"
import type { GridParams, PageResponse } from "@/types/common.types"

const BILLING_TYPES = ["Hourly", "Session", "Fixed"] as const

const DEFAULT_FILTERS = { billingType: "Hourly", type: "Matter" }

function clientLabel(v: unknown): string {
  const c = v as Record<string, string> | null
  if (!c) return "—"
  return c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
}

function personLabel(v: unknown): string {
  const u = v as Record<string, string> | null
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
}

function matterIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as { id?: string; matterId?: string } | undefined
  return String(mini?.id ?? mini?.matterId ?? row.matterId ?? (row.matter as { id?: string })?.id ?? "")
}

function clientIdOf(row: Record<string, unknown>): string {
  const c = (row.client ?? row.clients) as { id?: string; clientId?: string } | undefined
  return String(c?.id ?? c?.clientId ?? row.clientId ?? "")
}

export default function GenerateBillPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Record<string, unknown>>(DEFAULT_FILTERS)
  const [filters, setFilters] = useState<Record<string, unknown>>(DEFAULT_FILTERS)
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [prefill, setPrefill] = useState<InvoiceFormPrefill | undefined>()

  const billingType = String(filters.billingType ?? "Hourly")
  const isFixed = billingType === "Fixed"
  const draftBillingType = String(draft.billingType ?? "Hourly")
  const draftIsFixed = draftBillingType === "Fixed"

  const clientsQ = useQuery({
    queryKey: ["clients", "by-billing-type", draftBillingType],
    queryFn: () => billingApi.getClientsByBillingType(draftBillingType),
    enabled: !!draftBillingType,
    staleTime: 60_000,
  })

  const clientOpts = useMemo(() => {
    const list = clientsQ.data ?? []
    return list
      .map(c => {
        const id = String(c.id ?? c.clientId ?? "")
        const label = String(
          c.clientType === "PERSON"
            ? (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.companyName || id)
            : (c.companyName ?? c.name ?? id),
        )
        return { id, label }
      })
      .filter(o => o.id)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [clientsQ.data])

  const lfasQ = useQuery({
    queryKey: ["lfa", "mini", "generate-bill", draft.clientId],
    enabled: Boolean(draft.clientId),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "lfa1", agreementNo: "LFA-001" }]
      const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId: draft.clientId } })
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string }[]
    },
    staleTime: 60_000,
  })

  const lfaOpts = useMemo(
    () => (lfasQ.data ?? [])
      .map(l => ({ id: String(l.id ?? ""), label: String(l.agreementNo ?? l.id ?? "") }))
      .filter(l => l.id),
    [lfasQ.data],
  )

  const activityColumns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    { field: "client", header: "Client", minWidth: 140, renderCell: v => clientLabel(v) },
    {
      field: "note",
      header: "Description",
      minWidth: 160,
      renderCell: (v, row) => String(v || row.activity || "—"),
    },
    { field: "responsiblePerson", header: "Lawyer", renderCell: v => personLabel(v) },
    {
      field: "title",
      header: "Matter",
      minWidth: 140,
      renderCell: (v, row) => String(
        v || (row.matterMini as { title?: string })?.title || (row.matter as { title?: string })?.title || "—",
      ),
    },
    {
      field: "matterSubject",
      header: "Subject",
      renderCell: (v, row) => String(v || (row.matterMini as { subject?: string })?.subject || "—"),
    },
    {
      field: "agreementId",
      header: "Agreement #",
      renderCell: (v, row) => String(v || row.agreementNo || row.lfaNo || "—"),
    },
    {
      field: "createdAt",
      header: "Entry Date",
      renderCell: (v, row) => formatDate(String(v || row.entryDate || "")),
    },
    { field: "billingType", header: "Billing Type" },
    { field: "rate", header: "Rate", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
    {
      field: "quantity",
      header: "Qty / Hours",
      align: "right",
      renderCell: (v, row) => {
        if (v != null && v !== "") return String(v)
        const h = Number(row.hours ?? 0)
        const m = Number(row.minutes ?? 0)
        if (h || m) return `${h}:${String(m).padStart(2, "0")}`
        return "—"
      },
    },
    { field: "hourlyUnit", header: "Unit", renderCell: v => String(v || "—") },
    {
      field: "billing",
      header: "Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "invoiceCreated",
      header: "Invoiced",
      renderCell: v => (v === true ? "Yes" : "No"),
    },
  ], [])

  const fixedColumns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    { field: "title", header: "Title", minWidth: 160 },
    { field: "client", header: "Client", minWidth: 140, renderCell: v => clientLabel(v) },
    { field: "lfaNo", header: "Agreement No", renderCell: v => String(v || "—") },
    {
      field: "stage",
      header: "Stage",
      renderCell: (_v, row) => {
        const bd = row.currentBreakDown as { name?: string; rate?: number } | undefined
        return bd ? `${bd.name ?? "—"}: ${formatCurrency(Number(bd.rate ?? 0))}` : "—"
      },
    },
    {
      field: "maxBillingAmount",
      header: "Maximum Billing",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "billedAmount",
      header: "Billed Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "remainingAmount",
      header: "Remaining",
      align: "right",
      renderCell: (v, row) => formatCurrency(
        Number(v ?? (Number(row.maxBillingAmount ?? 0) - Number(row.billedAmount ?? 0))),
      ),
    },
  ], [])

  function openFromActivities(rows: Record<string, unknown>[]) {
    if (!rows.length) {
      toast.info("Select at least one activity")
      return
    }
    const first = rows[0]
    const matterIds = new Set(rows.map(matterIdOf).filter(Boolean))
    const clientIds = new Set(rows.map(clientIdOf).filter(Boolean))
    if (matterIds.size > 1) {
      toast.error("Selected activities must belong to the same matter")
      return
    }
    const matterId = [...matterIds][0] ?? matterIdOf(first)
    const clientId = [...clientIds][0] || clientIdOf(first) || String(filters.clientId ?? "")
    if (!clientId) {
      toast.error("Please select a client (or choose activities with a client)")
      return
    }
    if (!isFixed && !matterId && String(filters.type ?? "Matter") === "Matter") {
      toast.error("Selected activities must have a matter")
      return
    }
    setPrefill({
      clientId,
      matterId: matterId || undefined,
      activityIds: rows.map(r => String(r.id ?? r.activityId)).filter(Boolean),
      billingType,
      activities: rows,
      agreementId: String(first.agreementId ?? first.lfaId ?? filters.agreementId ?? "") || undefined,
    })
    setDrawerOpen(true)
  }

  function openFromMatter(row: Record<string, unknown>) {
    const matterId = String(row.id ?? row.matterId ?? "")
    const clientId = clientIdOf(row) || String(filters.clientId ?? "")
    if (!matterId) {
      toast.error("Matter id missing")
      return
    }
    if (!clientId) {
      toast.error("Please select a client first")
      return
    }
    if (isFixed && !filters.agreementId && !row.lfaId && !row.agreementId) {
      toast.error("Please select an agreement")
      return
    }
    setPrefill({
      clientId,
      matterId,
      billingType: "Fixed",
      agreementId: String(row.lfaId ?? row.agreementId ?? filters.agreementId ?? "") || undefined,
      activityIds: [],
      activities: [],
    })
    setDrawerOpen(true)
  }

  async function queryFn(p: GridParams): Promise<PageResponse<Record<string, unknown>>> {
    const params: GridParams = {
      ...p,
      filters: {
        ...filters,
        billingType,
        type: isFixed ? "Matter" : (filters.type ?? "Matter"),
      },
    }
    if (isFixed) return billingApi.getUnbilledMatters(params)
    return billingApi.getUnbilledActivities(params)
  }

  async function emailExcel() {
    try {
      toast.success(await billingApi.exportUnbilledActivities(filters))
    } catch (e: unknown) {
      toast.error(
        (e as { message?: string })?.message
        ?? (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? "Excel export failed",
      )
    }
  }

  function applySearch() {
    const next = {
      ...draft,
      billingType: draft.billingType ?? "Hourly",
      type: draftIsFixed ? "Matter" : (draft.type ?? "Matter"),
    }
    setFilters(next)
    setGridKey(k => k + 1)
  }

  function clearFilters() {
    setDraft(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title={t("nav.generateBill")}
      description={t("pages.generateBillDesc")}
      breadcrumbs={[
        { label: t("nav.billings"), path: "/billings" },
        { label: t("nav.generateBill") },
      ]}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={String(draft.type ?? "Matter")}
              disabled={draftIsFixed}
              onChange={e => setDraft(p => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="Matter">Matter</MenuItem>
              <MenuItem value="Client">Client</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Billing Type</InputLabel>
            <Select
              label="Billing Type"
              value={draftBillingType}
              onChange={e => {
                const v = e.target.value
                setDraft(p => ({
                  ...p,
                  billingType: v,
                  type: v === "Fixed" ? "Matter" : (p.type ?? "Matter"),
                  clientId: "",
                  matterId: "",
                  agreementId: "",
                }))
              }}
            >
              {BILLING_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={clientOpts}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={clientOpts.find(o => o.id === String(draft.clientId ?? "")) ?? null}
            onChange={(_, v) => {
              setDraft(p => ({ ...p, clientId: v?.id ?? "", matterId: "", agreementId: "" }))
            }}
            loading={clientsQ.isLoading}
            renderInput={params => <TextField {...params} label="Client" />}
          />
          <Autocomplete
            size="small"
            sx={{ minWidth: 180 }}
            options={lfaOpts}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={lfaOpts.find(o => o.id === String(draft.agreementId ?? "")) ?? null}
            onChange={(_, v) => setDraft(p => ({ ...p, agreementId: v?.id ?? "" }))}
            disabled={!draft.clientId}
            renderInput={params => <TextField {...params} label="Agreement (LFA)" />}
          />
          {!draftIsFixed && (
            <MatterSelectFilter
              value={String(draft.matterId ?? "") || undefined}
              onChange={v => setDraft(p => ({ ...p, matterId: v ?? "" }))}
            />
          )}
          <DateRangeFilter
            fromDate={String(draft.fromDate ?? "")}
            toDate={String(draft.toDate ?? "")}
            onChange={v => setDraft(p => ({ ...p, ...v }))}
          />
          <FilterActions
            onSearch={applySearch}
            onClear={clearFilters}
            searchLabel="Fetch"
            onExport={!draftIsFixed ? () => void emailExcel() : undefined}
            exportMode="email"
          />
        </Box>
      </Paper>

      <DataGrid
        key={`${gridKey}-${isFixed ? "fixed" : "activity"}`}
        columns={isFixed ? fixedColumns : activityColumns}
        queryKey={["billing", "generate", "unbilled", filters]}
        queryFn={queryFn}
        syncWithUrl={false}
        isSortingBackend={false}
        hasRowSelection={!isFixed}
        defaultPageSize={10}
        defaultSortBy={isFixed ? "title" : "createdAt"}
        defaultSortDir="desc"
        bulkActions={!isFixed ? [{
          label: "Generate Bill",
          icon: <ReceiptLongIcon fontSize="small" />,
          onClick: rows => openFromActivities(rows as Record<string, unknown>[]),
        }] : undefined}
        rowMenuItems={isFixed
          ? (row) => [{
              label: "Generate Bill",
              icon: <ReceiptLongIcon fontSize="small" />,
              onClick: () => openFromMatter(row as Record<string, unknown>),
            }]
          : undefined}
        emptyState={
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            {isFixed
              ? "No unbilled Fixed matters. Adjust filters and Fetch."
              : "No unbilled activities. Adjust filters and Fetch."}
          </Box>
        }
      />

      <InvoiceFormDrawer
        open={drawerOpen}
        prefill={prefill}
        onClose={() => { setDrawerOpen(false); setPrefill(undefined) }}
        onSuccess={() => {
          setDrawerOpen(false)
          setPrefill(undefined)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["billing", "generate"] })
          qc.invalidateQueries({ queryKey: ["invoices"] })
        }}
      />
    </PageShell>
  )
}
