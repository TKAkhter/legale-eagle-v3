/**
 * Cost Analysis report — LMS `/cost-analysis` parity.
 * Filters: billing type, client, LFA, matter, date range + Email Excel.
 */
import { useEffect, useMemo, useRef, useState } from "react"
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
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  ClientSelectFilter,
  DateRangeFilter,
  FilterActions,
  MatterSelectFilter,
} from "@/components/filters"
import { reportsApi } from "@/api/reports"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { ColumnDef } from "@/components/data-grid/types"
import type { FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function defaultFromDate() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10)
}

function defaultFilters(): Record<string, unknown> {
  return {
    billingType: "Hourly",
    fromDate: defaultFromDate(),
    toDate: defaultToDate(),
    clientId: "",
    matterId: "",
    lfaId: "",
  }
}

function clientLabel(row: Record<string, unknown>): string {
  const mini = row.matterMini as {
    clientMini?: Record<string, unknown> & {
      client?: Record<string, unknown>
    }
  } | null
  const nested = mini?.clientMini?.client
  const c = (nested ?? mini?.clientMini ?? null) as Record<string, unknown> | null
  if (!c) return String(row.clientName ?? "—")
  if (typeof c === "string") return c || "—"
  if (String(c.clientType ?? "") === "COMPANY" || c.companyName) {
    return String(c.companyName || c.name || "—")
  }
  return `${String(c.firstName ?? "")} ${String(c.lastName ?? "")}`.trim() || String(c.name || "—")
}

function clientIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as {
    clientMini?: { clientId?: string; id?: string; client?: { id?: string; clientId?: string } }
  } | null
  return String(
    row.clientId
    ?? mini?.clientMini?.clientId
    ?? mini?.clientMini?.id
    ?? mini?.clientMini?.client?.clientId
    ?? mini?.clientMini?.client?.id
    ?? "",
  )
}

function matterTitle(row: Record<string, unknown>): string {
  const mini = row.matterMini as { title?: string; matterId?: string } | null
  return String(row.matterTitle ?? mini?.title ?? row.matter ?? "—")
}

function matterIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as { matterId?: string; id?: string } | null
  return String(row.matterId ?? mini?.matterId ?? mini?.id ?? "")
}

function matterStatus(row: Record<string, unknown>): string {
  const mini = row.matterMini as { status?: string } | null
  return String(row.status ?? mini?.status ?? "")
}

function CostAnalysisFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(() => ({
    ...defaultFilters(),
    ...filters,
  }))
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const bootstrapped = useRef(false)

  // LMS loads cost report on mount with Hourly + last 30 days.
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    const initial = { ...defaultFilters(), ...filters }
    setF(initial)
    onSearch(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, [])

  const lfasQ = useQuery({
    queryKey: ["lfa", "all-active", "cost-analysis", f.clientId ?? ""],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "lfa1", agreementNo: "LFA-001", billingType: "Hourly" },
          { id: "lfa2", agreementNo: "LFA-002", billingType: "Fixed" },
        ]
      }
      const res = await axiosClient.get("/api/lfa/get/all/active")
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as { id?: string; agreementNo?: string; billingType?: string; clientId?: string }[]
    },
    staleTime: 60_000,
  })

  const agreements = (lfasQ.data ?? []).filter(a => {
    if (!a.id) return false
    const cid = String(f.clientId ?? "")
    if (!cid) return true
    if (!a.clientId) return true
    return String(a.clientId) === cid
  })

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Billing Type</InputLabel>
        <Select
          label="Billing Type"
          value={String(f.billingType ?? "Hourly")}
          onChange={e => set("billingType", e.target.value)}
        >
          <MenuItem value="Hourly">Hourly</MenuItem>
          <MenuItem value="Session">Session</MenuItem>
          <MenuItem value="Fixed">Fixed</MenuItem>
        </Select>
      </FormControl>

      <ClientSelectFilter
        value={String(f.clientId ?? "") || undefined}
        onChange={v => {
          set("clientId", v ?? "")
          set("matterId", "")
        }}
      />

      <Autocomplete
        size="small"
        sx={{ minWidth: 220 }}
        options={agreements}
        getOptionLabel={o => `${o.agreementNo ?? o.id}${o.billingType ? ` (${o.billingType})` : ""}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={agreements.find(a => a.id === String(f.lfaId ?? "")) ?? null}
        onChange={(_, v) => set("lfaId", v?.id ?? "")}
        renderInput={params => <TextField {...params} label="Agreement No." />}
      />

      <MatterSelectFilter
        value={String(f.matterId ?? "") || undefined}
        clientId={String(f.clientId ?? "") || undefined}
        onChange={v => set("matterId", v ?? "")}
      />

      <DateRangeFilter
        fromDate={String(f.fromDate ?? "")}
        toDate={String(f.toDate ?? "")}
        onChange={v => setF(p => ({ ...p, ...v }))}
      />

      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => {
          const cleared = defaultFilters()
          setF(cleared)
          onReset()
          onSearch(cleared)
        }}
        searchLabel="Search"
      />
    </Box>
  )
}

export default function CostAnalysisReportPage() {
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>(defaultFilters)
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return (
        <CostAnalysisFilters
          {...props}
          onSearch={f => {
            setAppliedFilters(f)
            props.onSearch(f)
          }}
          onReset={() => {
            setAppliedFilters(defaultFilters())
            props.onReset()
          }}
        />
      )
    }
  }, [])

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "lfaNo",
      header: "LFA Name",
      renderCell: (v, row) => String(v ?? row.lfa ?? row.agreementNo ?? "—"),
    },
    {
      field: "clientName",
      header: "Client",
      renderCell: (_v, row) => {
        const id = clientIdOf(row)
        const label = clientLabel(row)
        if (!id) return label
        return (
          <Link component={RouterLink} to={`/clients/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {label}
          </Link>
        )
      },
    },
    {
      field: "matterTitle",
      header: "Matter",
      renderCell: (_v, row) => {
        const id = matterIdOf(row)
        const title = matterTitle(row)
        if (!id) return title
        return (
          <Link component={RouterLink} to={`/matters/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
            {title}
          </Link>
        )
      },
    },
    {
      field: "totalTime",
      header: "Total Time",
      renderCell: v => String(v ?? "—"),
    },
    {
      field: "costOfHours",
      header: "Cost of Hour",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "billedAmount",
      header: "Billed Amount",
      align: "right",
      renderCell: (v, row) => formatCurrency(Number(v ?? row.billed ?? 0)),
    },
    {
      field: "difference",
      header: "Difference",
      align: "right",
      renderCell: (v, row) => formatCurrency(Number(v ?? row.margin ?? 0)),
    },
    {
      field: "status",
      header: "Matter Status",
      renderCell: (_v, row) => {
        const s = matterStatus(row)
        return s ? <StatusBadge status={s} /> : "—"
      },
    },
  ], [])

  async function handleEmailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestCostAnalysisExcel(appliedFilters))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Cost Analysis"
      description="LFA cost of hours, billed amount, and difference"
      action={(
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleEmailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "cost-analysis"]}
        queryFn={(p: GridParams) => reportsApi.getCostAnalysis(p)}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
