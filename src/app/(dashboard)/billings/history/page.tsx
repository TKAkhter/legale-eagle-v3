/**
 * Write-off / Credit-note history — LMS `/history`.
 * Requires Client + Type (WriteOff | CreditNote), then fetch.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ClientSelectFilter } from "@/components/filters/ClientSelectFilter"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { billingApi } from "@/api/billing"
import type { ColumnDef } from "@/components/data-grid/types"
import type { GridParams } from "@/types/common.types"

type HistoryType = "WriteOff" | "CreditNote"

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

function invoiceIdOf(row: Record<string, unknown>): string {
  const inv = row.invoice as Record<string, unknown> | undefined
  return String(row.invoiceId ?? inv?.id ?? "")
}

export default function BillingHistoryPage() {
  const navigate = useNavigate()
  const [clientId, setClientId] = useState("")
  const [type, setType] = useState<HistoryType>("WriteOff")
  const [fetchKey, setFetchKey] = useState(0)

  const writeOffColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      field: "taxInvoiceNo",
      header: "Invoice #",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        return text(_v ?? row.invoiceNo ?? inv?.taxInvoiceNo ?? inv?.invoiceNo)
      },
    },
    {
      field: "clientName",
      header: "Client",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        const client = (inv?.client ?? inv?.clientMini ?? row.client) as Record<string, unknown> | undefined
        return text(_v ?? client?.companyName ?? client?.name)
      },
    },
    {
      field: "billingType",
      header: "Billing Type",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        return text(_v ?? inv?.billingType)
      },
    },
    {
      field: "writeOffAmount",
      header: "Write-off Amount",
      align: "right",
      renderCell: (_v, row) => formatCurrency(Number(_v ?? row.amount ?? 0)),
    },
    {
      field: "dueAmount",
      header: "Due Amount",
      align: "right",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        return formatCurrency(Number(_v ?? inv?.dueAmount ?? inv?.amountDue ?? 0))
      },
    },
    { field: "reason", header: "Reason", renderCell: v => text(v) },
    { field: "createdBy", header: "By", renderCell: v => text(v) },
    {
      field: "createdAt",
      header: "Date",
      renderCell: v => (v ? formatDate(String(v)) : "—"),
    },
  ]

  const creditNoteColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      field: "taxInvoiceNo",
      header: "Invoice #",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        return text(_v ?? row.invoiceNo ?? inv?.taxInvoiceNo ?? inv?.invoiceNo)
      },
    },
    {
      field: "clientName",
      header: "Client",
      renderCell: (_v, row) => {
        const inv = row.invoice as Record<string, unknown> | undefined
        const client = (inv?.client ?? inv?.clientMini ?? row.client) as Record<string, unknown> | undefined
        return text(_v ?? client?.companyName ?? client?.name)
      },
    },
    {
      field: "creditNoteAmount",
      header: "Credit Note Amount",
      align: "right",
      renderCell: (_v, row) => formatCurrency(Number(_v ?? row.amount ?? 0)),
    },
    { field: "reason", header: "Reason", renderCell: v => text(v) },
    { field: "createdBy", header: "By", renderCell: v => text(v) },
    {
      field: "createdAt",
      header: "Date",
      renderCell: v => (v ? formatDate(String(v)) : "—"),
    },
  ]

  return (
    <PageShell title="Write-off / Credit History" description="Historical write-offs and credit notes">
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <ClientSelectFilter
            value={clientId}
            onChange={v => setClientId(v ?? "")}
            label="Client"
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as HistoryType)}
            >
              <MenuItem value="WriteOff">Write Off</MenuItem>
              <MenuItem value="CreditNote">Credit Note</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            disabled={!clientId}
            onClick={() => setFetchKey(k => k + 1)}
          >
            Fetch
          </Button>
        </Box>
        {!clientId && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Select a client and type, then click Fetch.
          </Typography>
        )}
      </Paper>

      <DataGrid
        columns={type === "WriteOff" ? writeOffColumns : creditNoteColumns}
        queryKey={["billings", "write-credit-history", clientId, type, fetchKey]}
        queryFn={async (p: GridParams) => {
          if (!clientId || fetchKey === 0) {
            return {
              content: [],
              totalElements: 0,
              totalPages: 0,
              number: 0,
              size: p.pageSize,
              first: true,
              last: true,
              empty: true,
            }
          }
          const page = await billingApi.getWriteCreditHistory({
            ...p,
            filters: { ...p.filters, clientId, type },
          })
          const content = page.content
            .filter(row => {
              const inv = (row as Record<string, unknown>).invoice
              return inv != null
            })
            .map((row, i) => {
              const r = row as Record<string, unknown>
              return {
                ...r,
                id: String(r.id ?? `${type}-${i}`),
                type: r.type ?? type,
              }
            })
          return { ...page, content, empty: content.length === 0 }
        }}
        zebraStriping
        syncWithUrl={false}
        emptyState={
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {clientId
              ? (fetchKey === 0 ? "Click Fetch to load history" : "No records found")
              : "Select a client and click Fetch"}
          </Typography>
        }
        rowMenuItems={row => {
          const id = invoiceIdOf(row as Record<string, unknown>)
          return id
            ? [{ label: "Open Invoice", onClick: () => navigate(`/billings/${id}`) }]
            : []
        }}
      />
    </PageShell>
  )
}
