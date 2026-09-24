/**
 * Short matter detail — LMS short-matter Details + Activities + Documents.
 */
import { useMemo, useState } from "react"
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom"
import {
  Box, Button, Checkbox, Chip, CircularProgress, Paper, Typography,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import UpgradeIcon from "@mui/icons-material/Upgrade"
import LockIcon from "@mui/icons-material/Lock"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Tabs } from "@/components/ui/Tabs"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { DetailInfoRow } from "@/components/detail/DetailInfoRow"
import { ShortMatterFormDrawer } from "../_components/ShortMatterFormDrawer"
import { PromoteShortMatterDrawer } from "../_components/PromoteShortMatterDrawer"
import { ShortMatterCloseDialog } from "../_components/ShortMatterCloseDialog"
import { ExpenseBillDrawer } from "../../../billings/_components/ExpenseBillDrawer"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

export default function ShortMatterDetailPage() {
  const { shortMatterId = "" } = useParams<{ shortMatterId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  const { data: matter, isLoading } = useQuery({
    queryKey: ["matters", "short", "detail", shortMatterId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return {
          id: shortMatterId,
          title: "Short Matter Demo",
          status: "OPEN",
          client: { id: "c1", companyName: "Al Rashid Holdings" },
          practiceArea: { name: "Litigation" },
          rate: 500,
        }
      }
      const r = await axiosClient.get("/api/matter/get/short/matter", {
        params: { id: shortMatterId },
      })
      return (r.data?.data ?? r.data ?? {}) as Record<string, unknown>
    },
    enabled: !!shortMatterId,
  })

  const { data: activities = [], isLoading: actsLoading, refetch: refetchActs } = useQuery({
    queryKey: ["matters", "short", "activities", shortMatterId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "a1", activity: "Review", activityType: "Expense", billable: true, rate: 100, invoiceCreated: false },
          { id: "a2", activity: "Filing", activityType: "Expense", billable: true, rate: 200, invoiceCreated: false },
        ]
      }
      const r = await axiosClient.get("/api/activity/get/by/Matter", {
        params: { matterId: shortMatterId },
      })
      const data = r.data?.data ?? r.data ?? []
      return Array.isArray(data) ? data : []
    },
    enabled: !!shortMatterId,
  })

  const m = (matter ?? {}) as Record<string, unknown>
  const status = String(m.status ?? "").toUpperCase()
  const closed = status === "CLOSE" || status === "CLOSED"
  const client = (m.client ?? m.clientMini) as { id?: string; companyName?: string; firstName?: string } | null
  const clientId = String(client?.id ?? m.clientId ?? "")
  const clientName = client?.companyName || client?.firstName || String(m.clientName ?? "—")
  const pa = m.practiceArea as { name?: string } | string | null
  const paName = typeof pa === "object" && pa ? pa.name : String(pa ?? m.practiceAreaName ?? "—")

  const billableRows = useMemo(
    () => (activities as Record<string, unknown>[]).filter(a => a.invoiceCreated !== true),
    [activities],
  )
  const selectedRows = billableRows.filter(a => selected.includes(String(a.id)))

  function toggle(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  if (isLoading) {
    return (
      <PageShell title="Short Matter">
        <CircularProgress size={28} />
      </PageShell>
    )
  }

  return (
    <PageShell
      title={String(m.title ?? m.matterTitle ?? "Short Matter")}
      description="Short-form matter detail"
      breadcrumbs={[
        { label: "Short Matters", path: "/matters/short" },
        { label: String(m.title ?? m.matterTitle ?? "Detail") },
      ]}
      action={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/matters/short" size="small" startIcon={<ArrowBackIcon />} variant="outlined">
            Back
          </Button>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          {!closed && (
            <Button size="small" variant="outlined" startIcon={<UpgradeIcon />} onClick={() => setPromoteOpen(true)}>
              Promote
            </Button>
          )}
          {!closed && (
            <Button size="small" variant="outlined" color="error" startIcon={<LockIcon />} onClick={() => setCloseOpen(true)}>
              Close
            </Button>
          )}
        </Box>
      }
    >
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{String(m.title ?? m.matterTitle ?? "")}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <StatusBadge status={status} />
            <Chip size="small" label="Short Matter" variant="outlined" />
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1 }}>
          <DetailInfoRow label="Client" value={clientName} />
          <DetailInfoRow label="Practice Area" value={paName ?? "—"} />
          <DetailInfoRow label="Rate" value={m.rate != null ? formatCurrency(Number(m.rate)) : "—"} />
          <DetailInfoRow label="Opened" value={m.openDate ? formatDate(String(m.openDate)) : "—"} />
          <DetailInfoRow label="Deadline" value={m.deadline ? formatDate(String(m.deadline)) : "—"} />
        </Box>
      </Paper>

      <Tabs
        tabs={[
          {
            label: "Activities",
            content: (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {billableRows.length} unbilled activit{billableRows.length === 1 ? "y" : "ies"}
                    {selected.length > 0 ? ` · ${selected.length} selected` : ""}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={selected.length === 0}
                    onClick={() => setInvoiceOpen(true)}
                  >
                    Generate Invoice
                  </Button>
                </Box>
                {actsLoading ? <CircularProgress size={24} /> : (
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                      <Box component="thead">
                        <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                          <Box component="th" sx={{ px: 1.5, py: 1, width: 48 }} />
                          {["Type", "Activity", "Billable", "Rate", "Created"].map(h => (
                            <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {(activities as Record<string, unknown>[]).map(a => {
                          const id = String(a.id ?? "")
                          const invoiced = a.invoiceCreated === true
                          const checked = selected.includes(id)
                          return (
                            <Box
                              component="tr"
                              key={id}
                              sx={{
                                borderTop: "1px solid",
                                borderColor: "divider",
                                opacity: invoiced ? 0.55 : 1,
                                bgcolor: checked ? "action.selected" : "transparent",
                              }}
                            >
                              <Box component="td" sx={{ px: 1.5, py: 1 }}>
                                <Checkbox
                                  size="small"
                                  disabled={invoiced}
                                  checked={checked}
                                  onChange={() => toggle(id)}
                                />
                              </Box>
                              <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{String(a.activityType ?? "—")}</Box>
                              <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{String(a.activity ?? a.note ?? "—")}</Box>
                              <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{a.billable === false ? "No" : "Yes"}</Box>
                              <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{formatCurrency(Number(a.rate ?? 0))}</Box>
                              <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{a.createdAt ? formatDate(String(a.createdAt)) : "—"}</Box>
                            </Box>
                          )
                        })}
                        {(activities as unknown[]).length === 0 && (
                          <Box component="tr">
                            <Box component="td" colSpan={6} sx={{ p: 3 }}>
                              <Typography color="text.secondary">No activities yet.</Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                )}
              </Box>
            ),
          },
          {
            label: "Documents",
            content: <DocumentsTab relatedTo="MATTER" relatedToId={shortMatterId} label="short matter" />,
          },
        ]}
      />

      <ShortMatterFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        shortMatterId={shortMatterId}
        onSuccess={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "short", "detail", shortMatterId] })
          toast.success("Short matter updated")
        }}
      />
      <PromoteShortMatterDrawer
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        shortMatter={m}
        onSuccess={() => {
          setPromoteOpen(false)
          toast.success("Promoted to long matter")
          navigate("/matters/short")
        }}
      />
      <ShortMatterCloseDialog
        open={closeOpen}
        matterId={shortMatterId}
        matterTitle={String(m.title ?? m.matterTitle ?? "")}
        onClose={() => setCloseOpen(false)}
        onClosed={() => {
          setCloseOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "short", "detail", shortMatterId] })
        }}
      />
      <ExpenseBillDrawer
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        activities={selectedRows}
        matter={{ id: shortMatterId }}
        client={clientId ? { id: clientId } : null}
        onSuccess={() => {
          setSelected([])
          setInvoiceOpen(false)
          void refetchActs()
        }}
      />
    </PageShell>
  )
}
