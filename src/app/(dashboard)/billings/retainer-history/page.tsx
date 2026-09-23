import { useState } from "react"
import { Box, Button, LinearProgress, Paper, Typography } from "@mui/material"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import { Link as RouterLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

export default function RetainerHistoryPage() {
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["billings", "retainer-history", filters],
    queryFn: () => billingApi.getRetainerStatements(filters, 0, 50),
  })

  const rows = (data?.content ?? []) as Record<string, unknown>[]

  async function download(statementId: string, ref?: string) {
    try {
      const blob = await billingApi.downloadRetainerPdf(statementId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${ref ?? statementId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Failed to download PDF")
    }
  }

  return (
    <PageShell
      title="Retainer Statement History"
      description="Previously generated retainer statements"
      breadcrumbs={[
        { label: "Billing", path: "/billings" },
        { label: "Retainer Statements", path: "/billings/retainer-statements" },
        { label: "History" },
      ]}
      action={(
        <Button component={RouterLink} to="/billings/retainer-statements" variant="contained">
          Generate New
        </Button>
      )}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <MatterSelectFilter value={matterId || undefined} onChange={v => setMatterId(v ?? "")} />
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={v => { setFromDate(v.fromDate ?? ""); setToDate(v.toDate ?? "") }}
          />
          <FilterActions
            onSearch={() => setFilters({
              clientId: clientId || undefined,
              matterId: matterId || undefined,
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            })}
            onClear={() => {
              setClientId("")
              setMatterId("")
              setFromDate("")
              setToDate("")
              setFilters({})
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {rows.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No retainer statements found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Reference", "Client", "LFA", "Matter", "Created", "Total Hrs", "Billed", "Remaining", ""].map(h => (
                  <Box component="th" key={h || "dl"} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map(r => {
                const id = String(r.id ?? r.statementId)
                const client = r.client as Record<string, string> | undefined
                const clientName = String(
                  r.clientName
                  ?? client?.companyName
                  ?? [client?.firstName, client?.lastName].filter(Boolean).join(" ")
                  ?? "—"
                )
                return (
                  <Box component="tr" key={id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600 }}>
                      {String(r.statementReference ?? r.reference ?? id)}
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{clientName}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.lfaNo ?? r.agreementNo ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.matterNo ?? r.matterTitle ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{formatDate(String(r.createdAt ?? ""))}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{Number(r.totalHours ?? 0).toFixed(2)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{Number(r.billedHours ?? 0).toFixed(2)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{Number(r.remainingHours ?? 0).toFixed(2)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => download(id, String(r.statementReference ?? id))}>
                        PDF
                      </Button>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Paper>
    </PageShell>
  )
}
