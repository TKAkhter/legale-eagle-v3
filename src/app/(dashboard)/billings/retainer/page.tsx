import { useMemo, useState } from "react"
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, MenuItem, Paper, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

export default function RetainerBillingPage() {
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [billingStatus, setBillingStatus] = useState("unbilled")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({ billingStatus: "unbilled" })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [stmtOpen, setStmtOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "retainer", filters],
    queryFn: () => billingApi.getRetainerActivities(filters),
  })

  const selectedRows = useMemo(
    () => (rows as Record<string, unknown>[]).filter(r => selected.has(String(r.id ?? r.activityId))),
    [rows, selected],
  )

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (!checked) { setSelected(new Set()); return }
    setSelected(new Set((rows as Record<string, unknown>[]).map(r => String(r.id ?? r.activityId))))
  }

  async function generateStatement() {
    if (!selectedRows.length) { toast.error("Select at least one activity"); return }
    setGenerating(true)
    try {
      const first = selectedRows[0]
      const url = await billingApi.generateRetainerStatement({
        clientId: first.clients ?? first.clientId ?? clientId,
        lfaId: first.lfaId,
        matterId: matterId || first.matterId,
        activityIds: selectedRows.map(r => r.id ?? r.activityId),
        activities: selectedRows,
      })
      toast.success("Retainer statement generated")
      setStmtOpen(false)
      setSelected(new Set())
      refetch()
      if (typeof url === "string" && url.startsWith("http")) {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to generate statement",
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageShell
      title="Retainer Billing"
      description="Bill retainer time activities and generate statements"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Retainer" }]}
      action={(
        <Button
          variant="contained"
          disabled={!selected.size}
          onClick={() => setStmtOpen(true)}
        >
          Generate Statement ({selected.size})
        </Button>
      )}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <MatterSelectFilter value={matterId || undefined} onChange={v => setMatterId(v ?? "")} />
          <TextField
            select size="small" label="Status" value={billingStatus}
            onChange={e => setBillingStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="unbilled">Unbilled</MenuItem>
            <MenuItem value="billed">Billed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ fromDate: f, toDate: t }) => { setFromDate(f ?? ""); setToDate(t ?? "") }}
          />
          <FilterActions
            onSearch={() => {
              setSelected(new Set())
              setFilters({
                clientId: clientId || undefined,
                matterId: matterId || undefined,
                billingStatus,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
              })
            }}
            onClear={() => {
              setClientId("")
              setMatterId("")
              setBillingStatus("unbilled")
              setFromDate("")
              setToDate("")
              setSelected(new Set())
              setFilters({ billingStatus: "unbilled" })
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {(rows as unknown[]).length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No retainer activities found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                <Box component="th" sx={{ px: 1, py: 1, width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={!!(rows as unknown[]).length && selected.size === (rows as unknown[]).length}
                    indeterminate={selected.size > 0 && selected.size < (rows as unknown[]).length}
                    onChange={e => toggleAll(e.target.checked)}
                  />
                </Box>
                {["Activity", "Matter", "Date", "Hours", "Amount", "Status"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(rows as Record<string, unknown>[]).map(r => {
                const id = String(r.id ?? r.activityId)
                const matter = (r.matterMini ?? r.matter) as Record<string, string> | undefined
                return (
                  <Box component="tr" key={id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <Box component="td" sx={{ px: 1, py: 1 }}>
                      <Checkbox size="small" checked={selected.has(id)} onChange={() => toggle(id)} />
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.activity ?? r.note ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(matter?.title ?? r.matterTitle ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{formatDate(String(r.entryDate ?? r.activityDate ?? ""))}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>
                      {Number(r.totalHours ?? ((Number(r.hours ?? 0) + Number(r.minutes ?? 0) / 60))).toFixed(2)}
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600 }}>{formatCurrency(Number(r.billing ?? r.rate ?? 0))}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Chip size="small" label={String(r.billingStatus ?? billingStatus)} variant="outlined" />
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={stmtOpen} onClose={() => !generating && setStmtOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Retainer Statement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a retainer statement for {selected.size} selected time activit{selected.size === 1 ? "y" : "ies"}.
          </Typography>
          <Typography variant="body2">
            Total hours:{" "}
            <strong>
              {selectedRows.reduce((s, r) => s + Number(r.totalHours ?? ((Number(r.hours ?? 0) + Number(r.minutes ?? 0) / 60))), 0).toFixed(2)}
            </strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStmtOpen(false)} disabled={generating}>Cancel</Button>
          <Button variant="contained" onClick={generateStatement} disabled={generating}>
            {generating ? "Generating…" : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
