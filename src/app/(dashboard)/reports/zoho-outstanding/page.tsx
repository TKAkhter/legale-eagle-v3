/**
 * Zoho Outstanding — OLD ZohoReportTabs (Client + Invoice).
 * Clients: GET /client/zoho → POST /zoho/outstanding { type: "customer" }
 * Invoices: GET /invoice/zoho → POST /zoho/outstanding { type: "invoice" }
 */
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams, PageResponse } from "@/types/common.types"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function pageOf<T extends Record<string, unknown>>(rows: T[], p: GridParams): PageResponse<T> {
  const start = p.page * p.pageSize
  const slice = rows.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= rows.length,
    empty: slice.length === 0,
  }
}

type ClientOpt = { id: string; clientId: string; label: string; zohoClientId: string }
type InvoiceOpt = { id: string; label: string; zohoInvoiceId: string; invoiceNo?: string }

function ClientsTab() {
  const [selected, setSelected] = useState<ClientOpt[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [gridKey, setGridKey] = useState(0)

  const clientsQ = useQuery({
    queryKey: ["reports", "zoho-outstanding", "clients"],
    queryFn: () => reportsApi.getZohoOutstandingClients(),
  })

  const fetchM = useMutation({
    mutationFn: (ids: string[]) => reportsApi.postZohoOutstandingCustomers(ids),
    onSuccess: result => {
      setErrorMessage(result.errorMessage)
      setRows(result.rows)
      setGridKey(k => k + 1)
      if (result.errorMessage) toast.info(result.errorMessage)
      else if (result.rows.length === 0) toast.info("No outstanding data returned")
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to fetch Zoho outstanding")
    },
  })

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 320, flex: 1 }}
            options={clientsQ.data ?? []}
            loading={clientsQ.isLoading}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={params => <TextField {...params} label="Clients (Zoho)" />}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            disabled={selected.length === 0 || fetchM.isPending}
            onClick={() => fetchM.mutate(selected.map(c => c.clientId))}
          >
            {fetchM.isPending ? "Fetching…" : "Fetch"}
          </Button>
        </Box>
      </Paper>

      {errorMessage && <Alert severity="info" sx={{ mb: 2 }}>{errorMessage}</Alert>}

      <DataGrid
        key={gridKey}
        columns={[
          { field: "contactName", header: "Contact" },
          { field: "customerName", header: "Customer" },
          { field: "companyName", header: "Company" },
          {
            field: "outstandingReceivable",
            header: "Outstanding Receivable",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "outstandingPayable",
            header: "Outstanding Payable",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          { field: "status", header: "Status" },
          { field: "legalEagleId", header: "Legal Eagle Id" },
          { field: "contactId", header: "Contact Id" },
          { field: "createdAt", header: "Created At" },
        ]}
        queryKey={["reports", "zoho-outstanding", "customer-rows", gridKey]}
        queryFn={(p: GridParams) => Promise.resolve(pageOf(rows, p))}
        syncWithUrl={false}
        isSortingBackend={false}
        zebraStriping
        emptyState={
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            Select Zoho-linked clients and Fetch to load outstanding balances.
          </Box>
        }
      />
    </Box>
  )
}

function InvoicesTab() {
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(MONTHS[now.getMonth()])
  const [year, setYear] = useState(now.getFullYear())
  const [selected, setSelected] = useState<InvoiceOpt[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [gridKey, setGridKey] = useState(0)

  const years = useMemo(() => {
    const y = now.getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [now])

  const invoicesQ = useQuery({
    queryKey: ["reports", "zoho-outstanding", "invoices", month, year],
    queryFn: () => reportsApi.getZohoOutstandingInvoiceOptions(month, year),
  })

  const fetchM = useMutation({
    mutationFn: (ids: string[]) => reportsApi.postZohoOutstandingInvoices(ids),
    onSuccess: result => {
      setErrorMessage(result.errorMessage)
      setRows(result.rows)
      setGridKey(k => k + 1)
      if (result.errorMessage) toast.info(result.errorMessage)
      else if (result.rows.length === 0) toast.info("No outstanding data returned")
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Failed to fetch Zoho outstanding")
    },
  })

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={month} onChange={e => { setMonth(e.target.value); setSelected([]) }}>
              {MONTHS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select label="Year" value={year} onChange={e => { setYear(Number(e.target.value)); setSelected([]) }}>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 320, flex: 1 }}
            options={invoicesQ.data ?? []}
            loading={invoicesQ.isLoading}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            getOptionLabel={o => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={params => <TextField {...params} label="Invoices (Zoho Due)" />}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            disabled={selected.length === 0 || fetchM.isPending}
            onClick={() => fetchM.mutate(selected.map(i => i.id))}
          >
            {fetchM.isPending ? "Fetching…" : "Fetch"}
          </Button>
        </Box>
      </Paper>

      {errorMessage && <Alert severity="info" sx={{ mb: 2 }}>{errorMessage}</Alert>}

      <DataGrid
        key={gridKey}
        columns={[
          { field: "customerName", header: "Name" },
          { field: "invoiceNumber", header: "Invoice Number" },
          {
            field: "amount",
            header: "Amount",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "balance",
            header: "Balance",
            align: "right",
            renderCell: v => (v == null ? "—" : formatCurrency(Number(v))),
          },
          { field: "currencyCode", header: "Currency" },
          { field: "referenceNumber", header: "Reference" },
          { field: "createdBy", header: "Created By" },
          { field: "status", header: "Status" },
          { field: "dueDate", header: "Due Date" },
        ]}
        queryKey={["reports", "zoho-outstanding", "invoice-rows", gridKey]}
        queryFn={(p: GridParams) => Promise.resolve(pageOf(rows, p))}
        syncWithUrl={false}
        isSortingBackend={false}
        zebraStriping
        emptyState={
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            Pick a month, select Zoho Due invoices, and Fetch outstanding balances.
          </Box>
        }
      />
    </Box>
  )
}

export default function ZohoOutstandingReportPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  return (
    <PageShell
      title={t("nav.zohoOutstanding")}
      description={t("pages.zohoOutstandingDesc")}
      breadcrumbs={[
        { label: t("nav.reports"), path: "/reports" },
        { label: t("nav.zohoOutstanding") },
      ]}
    >
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={t("pages.zohoClientsTab", "Clients")} />
        <Tab label={t("pages.zohoInvoicesTab", "Invoices")} />
      </Tabs>
      {tab === 0 ? <ClientsTab /> : <InvoicesTab />}
    </PageShell>
  )
}
