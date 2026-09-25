import { useSearchParams, Link as RouterLink } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material"
import HistoryIcon from "@mui/icons-material/History"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate, formatDateTime } from "@/lib/utils/formatDate"
import { formatCurrency } from "@/lib/utils/formatCurrency"

type InvoiceSnap = {
  id: string
  createdAt?: string
  userName?: string
  action?: string
  amount?: number
  status?: string
  note?: string
  snapInfo?: Record<string, unknown>
}

export default function InvoiceSnapsPage() {
  const [params] = useSearchParams()
  const id = params.get("id") ?? ""

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["invoice-snaps", id],
    queryFn: () => miscModulesApi.getInvoiceSnaps(id) as Promise<InvoiceSnap[]>,
    enabled: !!id,
  })

  const shortId = id ? (id.length > 12 ? `${id.slice(0, 8)}…` : id) : ""

  return (
    <PageShell
      title="Invoice History"
      description="Snapshots of invoice edits over time"
      breadcrumbs={
        id
          ? [
              { label: "Billing", path: "/billings" },
              { label: `#${shortId}`, path: `/billings/${id}` },
              { label: "Invoice History" },
            ]
          : [
              { label: "Billing", path: "/billings" },
              { label: "Invoice History" },
            ]
      }
    >
      {!id && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Open this page from an invoice’s <strong>Invoice History</strong> action
          (requires <code>?id=&lt;invoiceId&gt;</code>).
        </Alert>
      )}

      {id && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            component={RouterLink}
            to={`/billings/${id}`}
            size="small"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            Back to invoice
          </Button>
          <Chip size="small" icon={<HistoryIcon />} label={`Invoice ${shortId}`} variant="outlined" />
        </Box>
      )}

      {id && isLoading && <CircularProgress size={28} />}
      {id && isError && <Alert severity="error">Failed to load snapshots</Alert>}
      {id && !isLoading && !isError && data.length === 0 && (
        <Typography color="text.secondary">There is no history</Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: id && data.length ? 0 : 2 }}>
        {data.map((s, i) => {
          const snap = s.snapInfo ?? {}
          const amount =
            s.amount ??
            (snap.dueAmount != null ? Number(snap.dueAmount) : undefined) ??
            (snap.amount != null ? Number(snap.amount) : undefined)
          const status =
            s.status ??
            (snap.status != null ? String(snap.status) : undefined) ??
            (snap.invoiceStatus != null ? String(snap.invoiceStatus) : undefined)
          const note =
            s.note ??
            (snap.note != null ? String(snap.note) : undefined) ??
            (snap.remarks != null ? String(snap.remarks) : undefined)
          const invoiceNo = snap.invoiceNo != null ? String(snap.invoiceNo) : undefined

          return (
            <Paper key={String(s.id ?? i)} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {String(s.action ?? `Snapshot ${i + 1}`)}
                    {invoiceNo ? ` · ${invoiceNo}` : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {formatDateTime(s.createdAt) !== "—"
                      ? formatDateTime(s.createdAt)
                      : formatDate(s.createdAt)}
                    {" · "}
                    {s.userName || "—"}
                  </Typography>
                  {note && (
                    <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                      {note}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                  {status && <StatusBadge status={status} />}
                  {amount != null && !Number.isNaN(amount) && (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(amount)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          )
        })}
      </Box>
    </PageShell>
  )
}
