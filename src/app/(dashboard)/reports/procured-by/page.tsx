/**
 * Procured By Revenue — LMS `/procuredby-report` parity (card UI, not flatten).
 * GET `/report/procuredby/revenue` grouped by procured-by person + nested matters.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
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

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type InvoiceRow = {
  invoiceNo?: string
  status?: string
  dueAmount?: number
  issueDate?: string
  creditNoteAmount?: number
  discountedAmount?: number
  writeOffAmount?: number
  taxableAmount?: number
}

type MatterDetail = {
  matterId?: string
  matterTitle?: string
  clientId?: string
  clientName?: string
  companyName?: string
  typelead?: string
  billingType?: string
  matterDescription?: string
  billedAmount?: number
  creditNotesAmount?: number
  leadApprovedEstimate?: number
  leadConvertedDate?: string
  Invoices?: InvoiceRow[]
  invoices?: InvoiceRow[]
}

type ProcuredRow = {
  id?: string
  procuredByName?: string
  effectiveProcuredByName?: string
  totalLeadApprovedEstimate?: number
  totalCreditNoteAmount?: number
  totalNetAmount?: number
  totalWriteOffAmount?: number
  matterCount?: number
  details?: MatterDetail[]
}

function clientLabel(m: MatterDetail): string {
  const type = String(m.typelead ?? "").toLowerCase()
  if (type === "company") return String(m.companyName || m.clientName || "—")
  return String(m.clientName || m.companyName || "—")
}

function InvoiceListDialog({
  open,
  onClose,
  matter,
}: {
  open: boolean
  onClose: () => void
  matter: MatterDetail | null
}) {
  const invoices = matter?.Invoices ?? matter?.invoices ?? []
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Invoices{matter?.matterTitle ? ` — ${matter.matterTitle}` : ""}
      </DialogTitle>
      <DialogContent dividers>
        {invoices.length === 0 ? (
          <Typography color="text.secondary">No invoices</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {invoices.map((inv, idx) => (
              <Box
                key={`${inv.invoiceNo ?? idx}`}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  alignItems: "center",
                  p: 1,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 100 }}>
                  <ReceiptOutlinedIcon fontSize="small" color="primary" />
                  <Typography fontWeight={500}>{inv.invoiceNo || "—"}</Typography>
                </Box>
                <Chip
                  size="small"
                  label={inv.status || "—"}
                  color={
                    inv.status === "Due" ? "warning"
                      : inv.status === "Rejected" ? "error"
                        : "success"
                  }
                />
                <Typography variant="body2">
                  Due: <strong>{formatCurrency(Number(inv.dueAmount ?? 0))}</strong>
                </Typography>
                <Typography variant="body2">Issued: {inv.issueDate || "—"}</Typography>
                {(Number(inv.creditNoteAmount) > 0 || Number(inv.discountedAmount) > 0 || Number(inv.writeOffAmount) > 0) && (
                  <Box sx={{ width: "100%" }}>
                    {Number(inv.creditNoteAmount) > 0 && (
                      <Typography variant="caption" color="warning.main" display="block">
                        Credit Note: {formatCurrency(Number(inv.creditNoteAmount))}
                      </Typography>
                    )}
                    {Number(inv.discountedAmount) > 0 && (
                      <Typography variant="caption" color="warning.main" display="block">
                        Discount: {formatCurrency(Number(inv.discountedAmount))}
                      </Typography>
                    )}
                    {Number(inv.writeOffAmount) > 0 && (
                      <Typography variant="caption" color="warning.main" display="block">
                        Write Off: {formatCurrency(Number(inv.writeOffAmount))}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

function MatterCard({ matter }: { matter: MatterDetail }) {
  const [open, setOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const desc = matter.matterDescription || ""
  const isLong = desc.length > 50

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ pb: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
            {matter.clientId ? (
              <Link component={RouterLink} to={`/clients/${matter.clientId}`} onClick={e => e.stopPropagation()}>
                {clientLabel(matter)}
              </Link>
            ) : (
              <Typography component="span">{clientLabel(matter)}</Typography>
            )}
            <Typography component="span">—</Typography>
            {matter.matterId ? (
              <Link component={RouterLink} to={`/matters/${matter.matterId}`} onClick={e => e.stopPropagation()}>
                {matter.matterTitle || "—"}
              </Link>
            ) : (
              <Typography component="span">{matter.matterTitle || "—"}</Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {matter.billingType && (
              <Chip label={matter.billingType} size="small" color="info" />
            )}
            <Tooltip title="View invoices">
              <IconButton size="small" onClick={() => setInvoiceOpen(true)}>
                <ReceiptOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setOpen(o => !o)}>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {desc && (
          <Box
            sx={{
              mt: 1,
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
              cursor: isLong ? "pointer" : "default",
            }}
            onClick={() => isLong && setDescExpanded(e => !e)}
          >
            <Typography variant="body2" color="text.secondary">
              {descExpanded || !isLong ? desc : `${desc.slice(0, 50)}…`}
              {isLong && (
                <Typography component="span" color="primary" fontWeight={600} sx={{ ml: 0.5 }}>
                  {descExpanded ? "Show less" : "Read more"}
                </Typography>
              )}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="body2" color="success.main">
            Billed: <strong>{formatCurrency(Number(matter.billedAmount ?? 0))}</strong>
          </Typography>
          {Number(matter.creditNotesAmount) !== 0 && (
            <Typography variant="body2" color="warning.main">
              Credit Note: <strong>{formatCurrency(Number(matter.creditNotesAmount ?? 0))}</strong>
            </Typography>
          )}
          <Typography variant="body2">
            Lead Value: <strong>{formatCurrency(Number(matter.leadApprovedEstimate ?? 0))}</strong>
          </Typography>
          <Typography variant="body2">
            Converted: <strong>{matter.leadConvertedDate || "—"}</strong>
          </Typography>
        </Box>

        <Collapse in={open}>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            {(matter.Invoices ?? matter.invoices ?? []).length} invoice(s) — use the receipt icon to view details
          </Typography>
        </Collapse>
      </CardContent>
      <InvoiceListDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} matter={matter} />
    </Card>
  )
}

function PersonCard({ row }: { row: ProcuredRow }) {
  const [open, setOpen] = useState(false)
  const name = row.procuredByName || row.effectiveProcuredByName || "—"
  const details = [...(row.details ?? [])].sort(
    (a, b) => Number(b.billedAmount ?? 0) - Number(a.billedAmount ?? 0),
  )

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            {name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <StatBox label="Total Lead Value" value={formatCurrency(Number(row.totalLeadApprovedEstimate ?? 0))} color="primary.main" />
            <StatBox label="Total Credit Note Amount" value={formatCurrency(Number(row.totalCreditNoteAmount ?? 0))} color="warning.main" />
            <StatBox label="Total Net Amount" value={formatCurrency(Number(row.totalNetAmount ?? 0))} color="success.main" />
            {Number(row.totalWriteOffAmount) > 0 && (
              <StatBox label="Total Write Off Amount" value={formatCurrency(Number(row.totalWriteOffAmount ?? 0))} color="warning.dark" />
            )}
            <Chip label={`${row.matterCount ?? details.length} Matters`} size="small" />
            <IconButton onClick={() => setOpen(o => !o)}>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
        <Collapse in={open}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Matters & Clients
          </Typography>
          <Grid container spacing={2}>
            {details.map((m, idx) => (
              <Grid key={m.matterId ?? idx} size={{ xs: 12, md: 6 }}>
                <MatterCard matter={m} />
              </Grid>
            ))}
            {details.length === 0 && (
              <Grid size={12}>
                <Typography color="text.secondary">No matter details</Typography>
              </Grid>
            )}
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 1,
        px: 1.5,
        py: 0.75,
        minWidth: 120,
        textAlign: "center",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

const DEFAULT_FILTERS: Record<string, unknown> = {
  fromDate: monthStart(),
  toDate: today(),
  leadConvertedFromDate: monthStart(),
  leadConvertedToDate: today(),
  procuredBy: "",
  matterId: "",
  clientId: "",
  leadSource: "",
  billingType: "ALL",
}

export default function ProcuredByReportPage() {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...DEFAULT_FILTERS })
  const [applied, setApplied] = useState<Record<string, unknown>>({ ...DEFAULT_FILTERS })
  const [page, setPage] = useState(0)
  const [pageSize] = useState(5)
  const [excelLoading, setExcelLoading] = useState(false)

  const set = (k: string, v: unknown) => setDraft(p => ({ ...p, [k]: v }))

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

  const reportQ = useQuery({
    queryKey: ["reports", "procured-by", applied, page, pageSize],
    queryFn: () => reportsApi.getProcuredByRevenue({
      page,
      pageSize,
      sortBy: "matterTitle",
      sortDir: "desc",
      filters: applied,
    }),
  })

  const rows = (reportQ.data?.content ?? []) as ProcuredRow[]
  const totalPages = Math.max(1, reportQ.data?.totalPages ?? 1)

  function search() {
    setApplied({ ...draft })
    setPage(0)
  }

  function clear() {
    const next = { ...DEFAULT_FILTERS }
    setDraft(next)
    setApplied(next)
    setPage(0)
  }

  async function handleExcel() {
    setExcelLoading(true)
    try {
      toast.success(await reportsApi.requestProcuredByExcel(applied))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setExcelLoading(false)
    }
  }

  return (
    <PageShell
      title="Procured By Revenue"
      description="Revenue attributed to procured-by users (grouped cards)"
      action={(
        <Button
          variant="outlined"
          size="small"
          disabled={excelLoading}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleExcel() }}
        >
          {excelLoading ? "Exporting…" : "Excel"}
        </Button>
      )}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "flex-end",
          mb: 2,
          p: 2,
          bgcolor: "action.hover",
          borderRadius: 2,
        }}
      >
        <TextField
          size="small"
          type="date"
          label="Lead Converted From"
          value={String(draft.leadConvertedFromDate ?? "")}
          onChange={e => set("leadConvertedFromDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Lead Converted To"
          value={String(draft.leadConvertedToDate ?? "")}
          onChange={e => set("leadConvertedToDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Invoice Issue From"
          value={String(draft.fromDate ?? "")}
          onChange={e => set("fromDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Invoice Issue To"
          value={String(draft.toDate ?? "")}
          onChange={e => set("toDate", e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <UserSelectFilter
          label="Procured By"
          value={String(draft.procuredBy ?? "")}
          onChange={v => set("procuredBy", v ?? "")}
        />
        <Autocomplete
          size="small"
          sx={{ minWidth: 180 }}
          options={sourceOpts}
          getOptionLabel={o => o.name}
          isOptionEqualToValue={(a, b) => a.name === b.name}
          value={sourceOpts.find(s => s.name === String(draft.leadSource ?? "")) ?? null}
          onChange={(_, v) => set("leadSource", v?.name ?? "")}
          renderInput={params => <TextField {...params} label="Lead Source" />}
        />
        <ClientSelectFilter
          value={String(draft.clientId ?? "")}
          onChange={v => set("clientId", v ?? "")}
        />
        <MatterSelectFilter
          value={String(draft.matterId ?? "")}
          onChange={v => set("matterId", v ?? "")}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Billing Type</InputLabel>
          <Select
            label="Billing Type"
            value={String(draft.billingType ?? "ALL")}
            onChange={e => set("billingType", e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="Hourly">Hourly</MenuItem>
            <MenuItem value="Fixed">Fixed</MenuItem>
            <MenuItem value="Session">Session</MenuItem>
          </Select>
        </FormControl>
        <FilterActions onSearch={search} onClear={clear} searchLabel="Search" />
      </Box>

      {reportQ.isLoading ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Loading…</Typography>
      ) : reportQ.isError ? (
        <Typography color="error" sx={{ py: 4, textAlign: "center" }}>Failed to load report</Typography>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>No results</Typography>
      ) : (
        rows.map((row, i) => (
          <PersonCard key={String(row.id ?? row.procuredByName ?? i)} row={row} />
        ))
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            color="primary"
          />
        </Box>
      )}
    </PageShell>
  )
}
