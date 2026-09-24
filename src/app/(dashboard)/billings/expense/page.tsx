import { useState } from "react"
import { Box, Button, Checkbox, IconButton, Paper, Tooltip, Typography, LinearProgress } from "@mui/material"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { buildDisbursementFolderUrl } from "@/lib/onedrive/disbursementFolder"
import { ExpenseBillDrawer } from "../_components/ExpenseBillDrawer"
import { toast } from "@/lib/toast"

export default function ExpenseBillingPage() {
  const [clientId, setClientId] = useState("")
  const [matterId, setMatterId] = useState("")
  const [filters, setFilters] = useState<{ clientId?: string; matterId?: string }>({})
  const [selected, setSelected] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "expense", filters],
    queryFn: () => billingApi.getExpenseActivities({ ...filters, pageNumber: 0, pageSize: 200 }),
    enabled: !!(filters.clientId || filters.matterId),
  })

  const rows = ((data?.content ?? []) as Record<string, unknown>[]).filter(
    r => r.invoiceCreated !== true && r.billable !== false,
  )

  function toggle(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (selected.length === rows.length) setSelected([])
    else setSelected(rows.map(r => String(r.id ?? r.activityId)))
  }

  function openFolder(row: Record<string, unknown>) {
    const url = buildDisbursementFolderUrl(row)
    if (!url) {
      toast.info("No Disbursements folder path available for this expense")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const selectedRows = rows.filter(r => selected.includes(String(r.id ?? r.activityId)))

  return (
    <PageShell
      title="Expense Billing"
      description="Generate invoices from unbilled pass-to-client disbursements"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Expense" }]}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <MatterSelectFilter value={matterId} onChange={v => setMatterId(v ?? "")} />
          <FilterActions
            onSearch={() => {
              if (!clientId && !matterId) {
                toast.info("Select a client or matter first")
                return
              }
              setFilters({ clientId: clientId || undefined, matterId: matterId || undefined })
              setSelected([])
            }}
            onClear={() => {
              setClientId("")
              setMatterId("")
              setFilters({})
              setSelected([])
            }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {rows.length} unbilled expense{rows.length !== 1 ? "s" : ""}
          {selected.length > 0 ? ` · ${selected.length} selected` : ""}
        </Typography>
        <Button variant="contained" disabled={selected.length === 0} onClick={() => setDrawerOpen(true)}>
          Generate Invoice
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {!filters.clientId && !filters.matterId ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Select a client or matter and search to load expenses.</Typography>
          </Box>
        ) : rows.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No unbilled expenses found.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                <Box component="th" sx={{ px: 1.5, py: 1, width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={rows.length > 0 && selected.length === rows.length}
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    onChange={toggleAll}
                  />
                </Box>
                {["Date", "Description", "Type", "Amount", "Folder"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map(r => {
                const id = String(r.id ?? r.activityId)
                const checked = selected.includes(id)
                return (
                  <Box
                    component="tr"
                    key={id}
                    onClick={() => toggle(id)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: checked ? "action.selected" : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box component="td" sx={{ px: 1.5, py: 1 }}>
                      <Checkbox size="small" checked={checked} onChange={() => toggle(id)} onClick={e => e.stopPropagation()} />
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{formatDate(String(r.entryDate ?? ""))}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{String(r.note ?? r.activity ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{String(r.disbursementType ?? "—")}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13, fontWeight: 600 }}>{formatCurrency(Number(r.rate ?? r.billing ?? 0))}</Box>
                    <Box component="td" sx={{ px: 1, py: 0.5 }} onClick={e => e.stopPropagation()}>
                      <Tooltip title="View Disbursement folder">
                        <IconButton size="small" onClick={() => openFolder(r)} aria-label="Open folder">
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Paper>

      <ExpenseBillDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activities={selectedRows}
        matter={matterId ? { id: matterId } : null}
        client={clientId ? { id: clientId } : null}
        onSuccess={() => { setSelected([]); void refetch() }}
      />
    </PageShell>
  )
}
