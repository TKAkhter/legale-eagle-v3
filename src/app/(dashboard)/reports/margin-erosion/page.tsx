/**
 * Margin Erosion report — LMS `/matter-erosion-report` parity.
 * Group-by-matter vs fee-earner detail; filters department/billing/client/matter/user/dates.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
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
import { toast } from "@/lib/toast"
import type { ColumnDef, FilterPanelProps } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultFilters(departmentId = ""): Record<string, unknown> {
  return {
    departmentId,
    billingType: "Hourly",
    clientId: "",
    matterId: "",
    responsiblePersonId: "",
    fromDate: monthStart(),
    toDate: today(),
    groupByMatter: true,
  }
}

function erosionColor(n: number): string {
  if (n > 0) return "error.main"
  if (n < 0) return "success.main"
  return "text.primary"
}

function MarginErosionFilters({
  onSearch,
  onReset,
  filters,
  onApplied,
  defaultDepartmentId,
}: FilterPanelProps & {
  onApplied?: (f: Record<string, unknown>) => void
  defaultDepartmentId?: string
}) {
  const [f, setF] = useState<Record<string, unknown>>(() => ({
    ...defaultFilters(defaultDepartmentId),
    ...filters,
  }))
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))
  const bootstrapped = useRef(false)

  const deptsQ = useQuery({
    queryKey: ["departments", "margin-erosion"],
    queryFn: () => adminApi.getDepartments(),
    staleTime: 60_000,
  })

  const departments = useMemo(
    () => ((deptsQ.data ?? []) as { id?: string; name?: string }[])
      .map(d => ({ id: String(d.id ?? ""), name: String(d.name ?? "") }))
      .filter(d => d.id),
    [deptsQ.data],
  )

  useEffect(() => {
    if (bootstrapped.current) return
    // Wait for corporate dept default when available, else bootstrap once depts settle or empty
    if (deptsQ.isLoading) return
    bootstrapped.current = true
    const initial = {
      ...defaultFilters(defaultDepartmentId),
      ...filters,
      departmentId: String(filters.departmentId || defaultDepartmentId || ""),
    }
    setF(initial)
    onApplied?.(initial)
    onSearch(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once depts known
  }, [deptsQ.isLoading, defaultDepartmentId])

  function apply(next: Record<string, unknown>) {
    onApplied?.(next)
    onSearch(next)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={f.groupByMatter !== false && f.groupByMatter !== "false" ? "matter" : "feeEarner"}
        onChange={(_, v) => {
          if (!v) return
          const next = { ...f, groupByMatter: v === "matter" }
          setF(next)
          apply(next)
        }}
      >
        <ToggleButton value="matter">By Matter</ToggleButton>
        <ToggleButton value="feeEarner">By Fee Earner</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Department</InputLabel>
          <Select
            label="Department"
            value={String(f.departmentId ?? "")}
            onChange={e => set("departmentId", e.target.value)}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {departments.map(d => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
            <MenuItem value="ALL">All</MenuItem>
          </Select>
        </FormControl>
        <ClientSelectFilter
          value={String(f.clientId ?? "") || undefined}
          onChange={v => {
            set("clientId", v ?? "")
            set("matterId", "")
          }}
        />
        <MatterSelectFilter
          value={String(f.matterId ?? "") || undefined}
          clientId={String(f.clientId ?? "") || undefined}
          onChange={v => set("matterId", v ?? "")}
        />
        <UserSelectFilter
          label="Responsible Person"
          value={String(f.responsiblePersonId ?? "")}
          onChange={v => set("responsiblePersonId", v ?? "")}
        />
        <TextField
          size="small"
          type="date"
          label="From Date"
          value={String(f.fromDate ?? "")}
          onChange={e => set("fromDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To Date"
          value={String(f.toDate ?? "")}
          onChange={e => set("toDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FilterActions
          onSearch={() => apply(f)}
          onClear={() => {
            const next = defaultFilters(defaultDepartmentId)
            setF(next)
            onApplied?.(next)
            onReset()
            onSearch(next)
          }}
        />
      </Box>
    </Box>
  )
}

export default function MarginErosionPage() {
  const deptsQ = useQuery({
    queryKey: ["departments", "margin-erosion-default"],
    queryFn: () => adminApi.getDepartments(),
    staleTime: 60_000,
  })

  const defaultDeptId = useMemo(() => {
    const list = (deptsQ.data ?? []) as { id?: string; name?: string }[]
    const corporate = list.find(d => String(d.name ?? "").toLowerCase().includes("corporate"))
    return String(corporate?.id ?? "")
  }, [deptsQ.data])

  const [applied, setApplied] = useState<Record<string, unknown>>(() => defaultFilters())
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    if (!defaultDeptId) return
    setApplied(prev => {
      if (String(prev.departmentId ?? "")) return prev
      return { ...prev, departmentId: defaultDeptId }
    })
  }, [defaultDeptId])

  const groupByMatter = applied.groupByMatter !== false && applied.groupByMatter !== "false"

  const FilterPanel = useMemo(() => {
    return function Panel(props: FilterPanelProps) {
      return (
        <MarginErosionFilters
          {...props}
          defaultDepartmentId={defaultDeptId}
          onApplied={setApplied}
          onSearch={f => {
            setApplied(f)
            props.onSearch(f)
          }}
        />
      )
    }
  }, [defaultDeptId])

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    const cols: ColumnDef<Record<string, unknown>>[] = [
      {
        field: "clientName",
        header: "Client Name",
        renderCell: (v, row) => {
          const id = String(row.clientId ?? "")
          const name = String(v || "—")
          if (!id || name === "—") return name
          return (
            <Link component={RouterLink} to={`/clients/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
              {name}
            </Link>
          )
        },
      },
      {
        field: "matterTitle",
        header: "Matter Name",
        renderCell: (v, row) => {
          const id = String(row.matterId ?? "")
          const title = String(v || "—")
          if (!id || title === "—") return title
          return (
            <Link component={RouterLink} to={`/matters/${id}`} underline="hover" onClick={e => e.stopPropagation()}>
              {title}
            </Link>
          )
        },
      },
      { field: "billingType", header: "Type", renderCell: v => String(v || "—") },
    ]

    if (!groupByMatter) {
      cols.push({
        field: "responsiblePersonName",
        header: "Fee Earner",
        renderCell: v => String(v || "—"),
      })
    }

    cols.push(
      {
        field: "hourlyUnitTotal",
        header: "Hours",
        align: "right",
        renderCell: v => (v != null && v !== "" ? Number(v).toFixed(2) : "—"),
      },
      {
        field: "totalCost",
        header: "Cost",
        align: "right",
        renderCell: v => formatCurrency(Number(v ?? 0)),
      },
      {
        field: "totalRate",
        header: "Potential Revenue",
        align: "right",
        renderCell: v => formatCurrency(Number(v ?? 0)),
      },
      {
        field: "totalBilling",
        header: "Actual Revenue",
        align: "right",
        renderCell: v => formatCurrency(Number(v ?? 0)),
      },
    )

    if (groupByMatter) {
      cols.push(
        {
          field: "totalInvoiceBilled",
          header: "Billed (Invoice) Amount",
          align: "right",
          renderCell: v => formatCurrency(Number(v ?? 0)),
        },
        {
          field: "marginErosionByBilledAmount",
          header: "Margin Erosion by Billed / Cost",
          align: "right",
          renderCell: v => {
            const n = Number(v ?? 0)
            return (
              <Typography component="span" sx={{ color: erosionColor(n), fontWeight: 600, fontSize: 13 }}>
                {Number.isFinite(n) ? `${n.toFixed(2)}%` : "—"}
              </Typography>
            )
          },
        },
      )
    }

    cols.push(
      {
        field: "fixedFee",
        header: "LFA Value / Estimate",
        align: "right",
        renderCell: (_v, row) => {
          const billing = String(row.billingType ?? "")
          const val = billing === "Fixed"
            ? Number(row.fixedFee ?? 0)
            : Number(row.estimate ?? row.fixedFee ?? 0)
          return formatCurrency(val)
        },
      },
      {
        field: "marginErosion",
        header: "Margin Erosion",
        align: "right",
        renderCell: v => {
          const n = Number(v ?? 0)
          return (
            <Typography component="span" sx={{ color: erosionColor(n), fontWeight: 600, fontSize: 13 }}>
              {Number.isFinite(n) ? `${n.toFixed(2)}%` : "—"}
            </Typography>
          )
        },
      },
      {
        field: "lossOfMargin",
        header: "Loss of Margin",
        align: "right",
        renderCell: v => {
          const n = Number(v ?? 0)
          return (
            <Typography component="span" sx={{ color: erosionColor(n), fontWeight: 600, fontSize: 13 }}>
              {formatCurrency(n)}
            </Typography>
          )
        },
      },
    )

    return cols
  }, [groupByMatter])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestMarginErosionExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Margin Erosion Report"
      description="Cost vs revenue margin erosion by matter or fee earner"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
          disabled={emailing}
        >
          {emailing ? "Sending…" : "Email Excel"}
        </Button>
      )}
    >
      <DataGrid
        columns={columns}
        queryKey={["reports", "margin-erosion", groupByMatter ? "matter" : "feeEarner"]}
        queryFn={(p: GridParams) => reportsApi.getMarginErosion({
          ...p,
          filters: { ...applied, ...p.filters, groupByMatter },
        })}
        FilterPanel={FilterPanel}
        hasFilters
        syncWithUrl
        defaultSortBy="matterTitle"
        defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
