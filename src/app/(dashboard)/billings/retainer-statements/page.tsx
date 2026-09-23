import { useMemo, useState } from "react"
import { Box, Button, Checkbox, LinearProgress, MenuItem, Paper, TextField, Typography } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { DateRangeFilter } from "@components/filters/DateRangeFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { lfaApi } from "@/api/lfa"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

export default function RetainerStatementsPage() {
  const [clientId, setClientId] = useState("")
  const [agreementId, setAgreementId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filters, setFilters] = useState<Record<string, unknown>>({ billingStatus: "unbilled" })
  const [selected, setSelected] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  const { data: lfaPage } = useQuery({
    queryKey: ["lfa", "by-client", clientId],
    queryFn: () => lfaApi.getByClient(clientId, { page: 0, pageSize: 100 }),
    enabled: !!clientId,
  })

  const lfaOpts = useMemo(
    () => ((lfaPage?.content ?? []) as Record<string, unknown>[]).map(l => ({
      value: String(l.id ?? l.lfaId),
      label: String(l.agreementNo ?? l.lfaTitle ?? l.id),
    })),
    [lfaPage],
  )

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "retainer-activities", filters],
    queryFn: () => billingApi.getRetainerActivities(filters),
  })

  const list = rows as Record<string, unknown>[]

  function toggle(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (selected.length === list.length) setSelected([])
    else setSelected(list.map(r => String(r.id ?? r.activityId)))
  }

  async function generate() {
    if (selected.length === 0) { toast.info("Select at least one activity"); return }
    setGenerating(true)
    try {
      const selectedRows = list.filter(r => selected.includes(String(r.id ?? r.activityId)))
      const first = selectedRows[0] as Record<string, unknown>
      const pdfUrl = await billingApi.generateRetainerStatement({
        activityIds: selected,
        clientId: filters.clientId ?? clientId,
        lfaId: filters.agreementId ?? agreementId,
        matterId: filters.matterId ?? matterId,
        hours: 0,
        minutes: 0,
        totalHours: selectedRows.reduce((s, r) => s + Number(r.totalHours ?? 0), 0),
      })
      toast.success("Statement generated")
      if (pdfUrl && typeof pdfUrl === "string") window.open(pdfUrl, "_blank", "noreferrer")
      setSelected([])
      refetch()
      void first
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to generate statement"
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageShell
      title="Retainer Statements"
      description="Generate retainer statements from unbilled time activities"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Retainer Statements" }]}
      action={(
        <Button component={RouterLink} to="/billings/retainer-history" variant="outlined">
          Statement History
        </Button>
      )}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter
            value={clientId}
            onChange={v => {
              setClientId(v ?? "")
              setAgreementId("")
            }}
          />
          <TextField
            select
            size="small"
            label="LFA / Agreement"
            value={agreementId}
            onChange={e => setAgreementId(e.target.value)}
            sx={{ minWidth: 180 }}
            disabled={!clientId || lfaOpts.length === 0}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {lfaOpts.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <MatterSelectFilter value={matterId || undefined} onChange={v => setMatterId(v ?? "")} />
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onChange={v => { setFromDate(v.fromDate ?? ""); setToDate(v.toDate ?? "") }}
          />
          <FilterActions
            onSearch={() => {
              setFilters({
                billingStatus: "unbilled",
                clientId: clientId || undefined,
                agreementId: agreementId || undefined,
                matterId: matterId || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
              })
              setSelected([])
            }}
            onClear={() => {
              setClientId("")
              setAgreementId("")
              setMatterId("")
              setFromDate("")
              setToDate("")
              setFilters({ billingStatus: "unbilled" })
              setSelected([])
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {list.length} activities{selected.length > 0 ? ` · ${selected.length} selected` : ""}
        </Typography>
        <Button variant="contained" disabled={selected.length === 0 || generating} onClick={generate}>
          Generate Statement
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {list.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No retainer activities found. Adjust filters and search.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                <Box component="th" sx={{ px: 1.5, py: 1, width: 48 }}>
                  <Checkbox size="small" checked={list.length > 0 && selected.length === list.length} onChange={toggleAll} />
                </Box>
                {["Client", "Matter", "Description", "LFA", "Lawyer", "Hours", "Date"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {list.map(r => {
                const id = String(r.id ?? r.activityId)
                const client = r.client as Record<string, string> | undefined
                const matter = r.matter as Record<string, string> | undefined
                const lfa = r.lfa as Record<string, string> | undefined
                const clientName = client?.companyName
                  || [client?.firstName, client?.lastName].filter(Boolean).join(" ")
                  || "—"
                return (
                  <Box component="tr" key={id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <Box component="td" sx={{ px: 1.5, py: 1 }}>
                      <Checkbox size="small" checked={selected.includes(id)} onChange={() => toggle(id)} />
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{clientName}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(matter?.title ?? r.matterTitle ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.activity ?? r.note ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(lfa?.agreementNo ?? r.lfaNo ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.responsiblePersonName ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{Number(r.totalHours ?? 0).toFixed(2)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{formatDate(String(r.createdAt ?? r.entryDate ?? ""))}</Box>
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
