/**
 * Lead Value Report — LMS `/lead-value-report` parity (new UI).
 * Filters + flatten list from GET `/report/procuredby/revenue`; Excel via download-lead-value-report.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import {
  ClientSelectFilter,
  FilterActions,
  MatterSelectFilter,
  UserSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { adminApi } from "@/api/admin"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

type InvoiceMini = {
  creditNoteAmount?: number
  creditNoteVatAmount?: number
  discountedAmount?: number
  writeOffAmount?: number
  writeOffVatAmount?: number
}

function invoiceWriteOffTotal(invoices: InvoiceMini[] | undefined): number {
  if (!Array.isArray(invoices)) return 0
  return invoices.reduce((total, inv) => {
    const creditNote = (inv.creditNoteAmount || 0) - (inv.creditNoteVatAmount || 0)
    const discounted = inv.discountedAmount || 0
    const writeOff = (inv.writeOffAmount || 0) - (inv.writeOffVatAmount || 0)
    return total + creditNote + discounted + writeOff
  }, 0)
}

function invoiceCreditWriteOffOnly(invoices: InvoiceMini[] | undefined): number {
  if (!Array.isArray(invoices)) return 0
  return invoices.reduce((total, inv) => {
    const creditNote = (inv.creditNoteAmount || 0) - (inv.creditNoteVatAmount || 0)
    const writeOff = (inv.writeOffAmount || 0) - (inv.writeOffVatAmount || 0)
    return total + creditNote + writeOff
  }, 0)
}

function leadName(row: Record<string, unknown>): string {
  const type = String(row.typeLead ?? row.typelead ?? "").toUpperCase()
  if (type === "PERSON" || type === "PEOPLE") {
    return String(row.firstName || row.clientName || "—")
  }
  return String(row.companyName || row.leadCompanyName || row.clientName || "—")
}

function scopeText(row: Record<string, unknown>): string {
  return String(row.matterDescription || row.scopeOfWork || "—")
}

function LeadValueFilterPanel({ onSearch, onReset, filters, onApplied }: FilterPanelProps & {
  onApplied?: (f: Record<string, unknown>) => void
}) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  const sourcesQ = useQuery({
    queryKey: ["leadSources"],
    queryFn: () => adminApi.getLeadSources(),
    staleTime: 60_000,
  })

  const sourceOpts = useMemo(
    () => ((sourcesQ.data ?? []) as { id?: string; name?: string; sourceName?: string }[])
      .map(s => ({
        id: String(s.id ?? ""),
        name: String(s.sourceName ?? s.name ?? s.id ?? ""),
      }))
      .filter(s => s.name),
    [sourcesQ.data],
  )

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <TextField
        size="small"
        type="date"
        label="Lead Converted From"
        value={String(f.leadConvertedFromDate ?? "")}
        onChange={e => set("leadConvertedFromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Lead Converted To"
        value={String(f.leadConvertedToDate ?? "")}
        onChange={e => set("leadConvertedToDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Invoice Issue From"
        value={String(f.fromDate ?? "")}
        onChange={e => set("fromDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="Invoice Issue To"
        value={String(f.toDate ?? "")}
        onChange={e => set("toDate", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <UserSelectFilter
        label="Procured By"
        value={String(f.procuredBy ?? f.userId ?? "")}
        onChange={v => set("procuredBy", v ?? "")}
      />
      <Autocomplete
        size="small"
        sx={{ minWidth: 180 }}
        options={sourceOpts}
        getOptionLabel={o => o.name}
        isOptionEqualToValue={(a, b) => a.name === b.name}
        value={sourceOpts.find(s => s.name === String(f.leadSource ?? "")) ?? null}
        onChange={(_, v) => set("leadSource", v?.name ?? "")}
        renderInput={params => <TextField {...params} label="Lead Source" />}
      />
      <ClientSelectFilter
        value={String(f.clientId ?? "")}
        onChange={v => set("clientId", v ?? "")}
      />
      <MatterSelectFilter
        value={String(f.matterId ?? "")}
        onChange={v => set("matterId", v ?? "")}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Billing Type</InputLabel>
        <Select
          label="Billing Type"
          value={String(f.billingType ?? "ALL")}
          onChange={e => set("billingType", e.target.value)}
        >
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
        </Select>
      </FormControl>
      <FilterActions
        onSearch={() => apply(f)}
        onClear={() => { setF({}); onApplied?.({}); onReset() }}
        searchLabel="Search"
      />
    </Box>
  )
}

export default function LeadValueReportPage() {
  const { t } = useTranslation()
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return <LeadValueFilterPanel {...props} onApplied={setAppliedFilters} />
    }
  }, [])

  async function handleExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestLeadValueExcel(appliedFilters))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title={t("nav.leadValue")}
      description={t("pages.leadValueDesc")}
      action={(
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={[
          {
            field: "leadCompanyName",
            header: "Lead Name",
            renderCell: (_v, row) => leadName(row as Record<string, unknown>),
          },
          {
            field: "leadConvertedDate",
            header: "Lead Converted Date",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "leadSource",
            header: "Lead Source",
            renderCell: v => String(v || "—"),
          },
          {
            field: "attorneyName",
            header: "Responsible Lawyer",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).responsibleAttorney
              || "—",
            ),
          },
          {
            field: "addedByName",
            header: "Lead Created By",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).leadCreatedBy
              || "—",
            ),
          },
          {
            field: "procuredByName",
            header: "Procured By",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).procuredBy
              || "—",
            ),
          },
          {
            field: "departmentName",
            header: "Department",
            renderCell: v => String(v || "—"),
          },
          {
            field: "practiceAreaName",
            header: "Practice Area",
            renderCell: v => String(v || "—"),
          },
          {
            field: "clientName",
            header: "Client",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const id = String(r.clientId ?? "")
              const label = String(v || r.companyName || "—")
              if (!id) return label
              return (
                <Link component={RouterLink} to={`/clients/${id}`} onClick={e => e.stopPropagation()}>
                  {label}
                </Link>
              )
            },
          },
          {
            field: "matterTitle",
            header: "Matter Number",
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const id = String(r.matterId ?? "")
              const label = String(v || "—")
              if (!id) return label
              return (
                <Link component={RouterLink} to={`/matters/${id}`} onClick={e => e.stopPropagation()}>
                  {label}
                </Link>
              )
            },
          },
          {
            field: "lfaNumber",
            header: "LFA Number",
            renderCell: (v, row) => String(
              v
              || (row as Record<string, unknown>).agreementNumber
              || "—",
            ),
          },
          {
            field: "billingType",
            header: "Billing Type",
            renderCell: v => String(v || "—"),
          },
          {
            field: "lfaValueEstimate",
            header: "LFA Value / Estimate",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const billing = String(r.billingType ?? "")
              const amount = billing === "Fixed" ? Number(r.fixedFee ?? 0) : Number(r.estimate ?? 0)
              if (!amount && r.fixedFee == null && r.estimate == null) return "—"
              return formatCurrency(amount)
            },
          },
          {
            field: "leadApprovedEstimate",
            header: "Lead Approved Estimate",
            align: "right",
            renderCell: v => (v == null || v === "" ? "—" : formatCurrency(Number(v))),
          },
          {
            field: "matterDescription",
            header: "Scope of Work",
            renderCell: (_v, row) => {
              const full = scopeText(row as Record<string, unknown>)
              const trimmed = full.length > 30 ? `${full.slice(0, 30)}…` : full
              if (full === trimmed) return <Typography variant="body2">{trimmed}</Typography>
              return (
                <Tooltip title={full}>
                  <Typography variant="body2" sx={{ cursor: "pointer" }}>{trimmed}</Typography>
                </Tooltip>
              )
            },
          },
          {
            field: "matterCreatedDate",
            header: "Matter Created Date",
            renderCell: (v, row) => {
              const d = v || (row as Record<string, unknown>).matterOpenDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "actualAmount",
            header: "Value of Billed Invoice Without VAT",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "writeOffValue",
            header: "Write off/Credit Note/ Discount Amount without VAT",
            align: "right",
            renderCell: (_v, row) => {
              const invoices = (row as Record<string, unknown>).Invoices as InvoiceMini[] | undefined
              return formatCurrency(invoiceWriteOffTotal(invoices))
            },
          },
          {
            field: "netValue",
            header: "Total Net Value",
            align: "right",
            renderCell: (_v, row) => {
              const r = row as Record<string, unknown>
              const billed = Number(r.actualAmount ?? 0)
              const creditWo = invoiceCreditWriteOffOnly(r.Invoices as InvoiceMini[] | undefined)
              return formatCurrency(billed - creditWo)
            },
          },
        ]}
        queryKey={["reports", "lead-value"]}
        queryFn={(p: GridParams) => reportsApi.getLeadValue(p)}
        FilterPanel={FilterPanel}
        hasFilters
        defaultSortBy="matterTitle"
        defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
