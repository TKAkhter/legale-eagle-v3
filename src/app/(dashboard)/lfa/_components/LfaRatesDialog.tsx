import {
  Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
  TableCell, TableBody, CircularProgress, Box, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { lfaApi } from "@/api/lfa"
import { formatCurrency } from "@lib/utils/formatCurrency"

interface Props {
  open: boolean
  lfaId?: string
  onClose: () => void
}

function rateName(row: Record<string, unknown>): string {
  const billingType = String(row.billingType ?? "")
  if (billingType === "Hourly") {
    const des = row.designation as { name?: string } | string | null
    if (typeof des === "string") return des
    return des?.name ?? String(row.name ?? "—")
  }
  if (billingType === "Session") {
    const st = row.sessionTypeName as { typeName?: string } | null
    return st?.typeName ?? String(row.name ?? "—")
  }
  return String(row.name ?? row.designation ?? "—")
}

export function LfaRatesDialog({ open, lfaId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["lfa", "rates", lfaId],
    queryFn: () => lfaApi.getRates(String(lfaId)),
    enabled: open && !!lfaId,
  })

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>LFA Rates</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No rates found.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Billing Type</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">Default Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={String(row.id ?? i)}>
                  <TableCell>{String(row.billingType ?? "—")}</TableCell>
                  <TableCell>{rateName(row)}</TableCell>
                  <TableCell align="right">
                    {row.rate != null || row.hourlyRate != null
                      ? formatCurrency(Number(row.rate ?? row.hourlyRate ?? 0))
                      : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {row.defaultRate != null ? formatCurrency(Number(row.defaultRate)) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
