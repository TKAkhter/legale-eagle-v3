/**
 * Invoice Print View — clean printable invoice layout.
 *
 * URL: /billings/print?invoiceId=xxx
 * Opens in a new tab, auto-triggers browser print dialog.
 *
 * No sidebar, no toolbar — just the invoice content styled for print.
 * CSS @media print rules hide any screen-only elements.
 *
 * Static mode: uses invoice data from src/data/static.ts
 * Live mode:   fetches from /api/invoice/get/by/id
 */
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Box, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from "@mui/material"
import { billingApi } from "@/api/billing"
import { formatDate, formatDateTime } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function InvoicePrintPage() {
  const [params] = useSearchParams()
  const invoiceId = params.get("invoiceId") ?? ""

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", "print", invoiceId],
    queryFn: () => billingApi.getById(invoiceId),
    enabled: !!invoiceId,
  })

  // Auto-trigger print dialog when data loads
  useEffect(() => {
    if (invoice) {
      const timer = setTimeout(() => window.print(), 500)
      return () => clearTimeout(timer)
    }
  }, [invoice])

  if (isLoading || !invoice) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  const inv = invoice as Record<string, unknown>
  const client = inv.client as Record<string, string> | undefined
  const matter = inv.matter as Record<string, string> | undefined

  return (
    <Box sx={{
      maxWidth: 800,
      mx: "auto",
      p: 6,
      fontFamily: "'IBM Plex Sans', sans-serif",
      "@media print": {
        p: 4,
        "& .no-print": { display: "none" },
      },
    }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#0F2744", mb: 0.5 }}>
            Legal Eagle LMS
          </Typography>
          <Typography variant="body2" color="text.secondary">DXB, United Arab Emirates</Typography>
          <Typography variant="body2" color="text.secondary">info@legaleaglelms.com</Typography>
          <Typography variant="body2" color="text.secondary">TRN: 100337</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0F2744", mb: 0.5 }}>
            TAX INVOICE
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {String(inv.invoiceNo ?? "")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Issue date: {formatDate(String(inv.issueDate ?? ""))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Due date: {formatDate(String(inv.dueDate ?? ""))}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3, borderColor: "#0F2744", borderWidth: 2 }} />

      {/* Bill to / Matter */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, mb: 4 }}>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
            Bill To
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
            {client?.companyName ?? client?.firstName ?? "—"}
          </Typography>
          {client?.email && <Typography variant="body2" color="text.secondary">{client.email}</Typography>}
          {client?.phone && <Typography variant="body2" color="text.secondary">{client.phone}</Typography>}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
            Matter
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
            {matter?.title ?? "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Billing type: {String(inv.billingType ?? "—")}
          </Typography>
        </Box>
      </Box>

      {/* Line items */}
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#0F2744" }}>
            {["Description", "Hours", "Rate", "Amount"].map(h => (
              <TableCell key={h} sx={{ color: "#fff", fontWeight: 600, py: 1.5 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {((inv.activities as Record<string,unknown>[]) ?? []).length > 0
            ? (inv.activities as Record<string,unknown>[]).map((a, i) => (
                <TableRow key={i} sx={{ "&:nth-of-type(odd)": { bgcolor: "#F8FAFC" } }}>
                  <TableCell>{String(a.activity ?? a.description ?? "—")}</TableCell>
                  <TableCell>{Number(a.hours ?? 0).toFixed(1)}</TableCell>
                  <TableCell>{formatCurrency(Number(a.rate ?? 0))}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{formatCurrency(Number(a.amount ?? 0))}</TableCell>
                </TableRow>
              ))
            : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    {String(inv.billingType ?? "")} fees
                  </Typography>
                </TableCell>
              </TableRow>
            )
          }
        </TableBody>
      </Table>

      {/* Totals */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
        <Box sx={{ minWidth: 280 }}>
          {[
            ["Subtotal",     formatCurrency(Number(inv.amount ?? 0))],
            [`VAT (${inv.vatRate ?? 5}%)`, formatCurrency(Number(inv.vatAmount ?? 0))],
            ["Total",        formatCurrency(Number(inv.taxableAmount ?? 0)), true],
            ["Paid",         formatCurrency(Number(inv.paidAmount ?? 0))],
            ["Balance Due",  formatCurrency(Number(inv.balanceAmount ?? 0)), true],
          ].map(([label, value, bold]) => (
            <Box key={String(label)} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderTop: bold ? "2px solid" : "1px solid", borderColor: bold ? "#0F2744" : "divider" }}>
              <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400, color: label === "Balance Due" && Number(inv.balanceAmount) > 0 ? "error.main" : "inherit" }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
        Payment due within {String(inv.dueDays ?? 30)} days of issue date.
        Bank transfer to: Legal Eagle LMS — IBAN: AE07 0331 2345 6789 0123 456
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center", display: "block", mt: 0.5, fontSize: 10 }}>
        Generated by LegalEagle LMS — {formatDateTime(new Date().toISOString())}
      </Typography>
    </Box>
  )
}
