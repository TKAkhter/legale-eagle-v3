import { Box, Button, FormControlLabel, LinearProgress, Paper, Switch, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { zohoApi } from "@/api/zoho"

const FLAGS: { key: string; label: string }[] = [
  { key: "zohoCreateClient", label: "Create Client in Zoho" },
  { key: "zohoUpdateClient", label: "Update Client in Zoho" },
  { key: "zohoCreateInvoice", label: "Create Invoice in Zoho" },
  { key: "zohoUploadAttachment", label: "Upload Attachment to Zoho" },
  { key: "zohoCreateCreditNote", label: "Create Credit Note in Zoho" },
  { key: "zohoUploadCreditNoteAttachment", label: "Upload Credit Note Attachment to Zoho" },
  { key: "zohoCreateVendor", label: "Create Vendor in Zoho" },
  { key: "zohoUpdateVendor", label: "Update Vendor in Zoho" },
]

export default function ZohoIntegrationPage() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["zoho", "integration"],
    queryFn: () => zohoApi.getIntegrationSettings(),
  })

  const row = (data ?? {}) as Record<string, unknown>

  return (
    <PageShell
      title="Zoho Integration Options"
      description="Current Zoho Books sync toggles (read-only from LMS settings)"
      breadcrumbs={[{ label: "Settings", path: "/admin/settings" }, { label: "Zoho Integration" }]}
      action={<Button variant="outlined" onClick={() => refetch()} disabled={isFetching}>Refresh</Button>}
    >
      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Typography color="error" sx={{ mb: 2 }}>Failed to load integration settings.</Typography>}

      {!isLoading && !data ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <Typography color="text.secondary">No integration settings found.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 560 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {FLAGS.map(f => (
              <Box key={f.key} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2">{f.label}</Typography>
                <FormControlLabel
                  control={<Switch checked={!!row[f.key]} disabled />}
                  label={row[f.key] ? "On" : "Off"}
                  labelPlacement="start"
                />
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2">{String(row.lastUpdated ?? "—")}</Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </PageShell>
  )
}
