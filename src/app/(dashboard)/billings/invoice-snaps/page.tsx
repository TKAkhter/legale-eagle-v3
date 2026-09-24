import { useSearchParams } from "react-router-dom"
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { miscModulesApi } from "@/api/miscModules"

export default function InvoiceSnapsPage() {
  const [params] = useSearchParams()
  const id = params.get("id") ?? ""

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["invoice-snaps", id],
    queryFn: () => miscModulesApi.getInvoiceSnaps(id),
    enabled: !!id,
  })

  return (
    <PageShell title="Invoice Snapshots" description="Historical snapshots for an invoice">
      {!id && <Alert severity="info">Open this page with ?id=&lt;invoiceId&gt; from an invoice row.</Alert>}
      {id && isLoading && <CircularProgress size={28} />}
      {id && isError && <Alert severity="error">Failed to load snapshots</Alert>}
      {id && !isLoading && !isError && data.length === 0 && (
        <Typography color="text.secondary">There is no history</Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 2 }}>
        {(data as Record<string, unknown>[]).map((s, i) => (
          <Paper key={String(s.id ?? i)} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {String(s.action ?? s.snapAction ?? `Snapshot ${i + 1}`)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {String(s.createdAt ?? s.date ?? "—")} · {String(s.userName ?? s.createdBy ?? "—")}
            </Typography>
          </Paper>
        ))}
      </Box>
    </PageShell>
  )
}
