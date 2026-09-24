import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Box, Typography, Paper, Chip, Button, Divider } from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import AddIcon from "@mui/icons-material/Add"
import CloseIcon from "@mui/icons-material/Close"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import PrintIcon from "@mui/icons-material/Print"
import EditIcon from "@mui/icons-material/Edit"
import GavelIcon from "@mui/icons-material/Gavel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { HearingFormDrawer } from "../_components/HearingFormDrawer"
import { ContinueHearingDrawer } from "../_components/ContinueHearingDrawer"
import { CloseHearingDrawer } from "../_components/CloseHearingDrawer"
import { MatterTimeline } from "../_components/MatterTimeline"
import { MatterOverview } from "../_components/MatterOverview"
import { MatterNotesPanel } from "../_components/MatterNotesPanel"
import { MatterCloseDialog } from "../_components/MatterCloseDialog"
import PauseCircleOutlineOutlinedIcon from "@mui/icons-material/PauseCircleOutlineOutlined"
import { MatterFormDrawer } from "../_components/MatterFormDrawer"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { StopWorkingDrawer } from "../_components/StopWorkingDrawer"
import { MatterFinancialsTab } from "../_components/MatterFinancialsTab"
import { useStopwatchStore, getActiveMatterTimers, setActiveMatterTimers, MAX_MATTER_TIMERS } from "@lib/store/stopwatchStore"
import { useAuthStore } from "@lib/store/authStore"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import {
  matterHearings as SH,
  matterTasks as ST,
  matterTimelogs as STL,
  matterInvoices as SI,
} from "@/data/static"
import type { GridParams } from "@/types/common.types"

function personName(value: unknown): string {
  const p = value as { firstName?: string; lastName?: string } | null
  return p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—" : "—"
}

export default function MatterDetailPage() {
  const { matterId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const startStopwatch = useStopwatchStore(s => s.start)
  const setTimers = useStopwatchStore(s => s.setTimers)
  const canEdit = useAuthStore(s => s.hasPermission)("/matters")
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [hearingOpen, setHearingOpen] = useState(false)
  const [continueHearing, setContinueHearing] = useState<Record<string, unknown> | null>(null)
  const [closeHearingId, setCloseHearingId] = useState<string | null>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [stopWorkingOpen, setStopWorkingOpen] = useState(false)
  const [startingTimer, setStartingTimer] = useState(false)

  const { data: matter, isLoading, isError } = useQuery({
    queryKey: ["matters", "detail", matterId],
    queryFn: () => {
      logger.debug("MatterDetail", `id:${matterId}`)
      return mattersApi.getById(matterId!)
    },
    enabled: !!matterId,
  })

  const hearingsTimeline = useQuery({ queryKey: ["matters", "hearings", matterId, "timeline"], queryFn: () => mattersApi.getHearings(matterId!, { page: 0, pageSize: 100 }), enabled: !!matterId })
  const tasksTimeline = useQuery({ queryKey: ["matters", "tasks", matterId, "timeline"], queryFn: () => mattersApi.getTasks(matterId!, { page: 0, pageSize: 100 }), enabled: !!matterId })
  const timelogsTimeline = useQuery({ queryKey: ["matters", "timelogs", matterId, "timeline"], queryFn: () => mattersApi.getTimelogs(matterId!, { page: 0, pageSize: 100 }), enabled: !!matterId })
  const invoicesTimeline = useQuery({ queryKey: ["matters", "invoices", matterId, "timeline"], queryFn: () => mattersApi.getInvoices(matterId!, { page: 0, pageSize: 100 }), enabled: !!matterId })

  if (isLoading) return <PageShell title="Matter"><DetailSkeleton /></PageShell>
  if (isError || !matter) {
    return (
      <PageShell title="Matter" breadcrumbs={[{ label: "Matters", path: "/matters" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Matter not found.</Typography>
      </PageShell>
    )
  }

  const m = matter as Record<string, unknown>
  const status = String(m.status ?? "")
  const isOpen = status === "OPEN" || status === "RE_OPEN"
  const atty = m.responsibleAttorney as { firstName?: string; lastName?: string } | null
  const cl = (m.client ?? m.clientMini) as { companyName?: string; firstName?: string } | null
  const pa = (m.practiceArea as { name?: string })?.name ?? ""
  const id = String(m.matterId ?? matterId ?? "")
  const stopWorking = m.matterStopWorking as { matterStopWorkingEnabled?: boolean; matterStopWorkingReasonId?: string } | null
  const stopWorkingEnabled = !!(stopWorking?.matterStopWorkingEnabled ?? m.stopWorkingEnabled)

  function activityHours(row: Record<string, unknown>): string {
    if (row.totalHours != null && row.totalHours !== "") return Number(row.totalHours).toFixed(1)
    const h = Number(row.hours ?? 0)
    const min = Number(row.minutes ?? 0)
    if (h || min) return `${h}:${String(min).padStart(2, "0")}h`
    return "0.0"
  }

  function personOrName(value: unknown): string {
    if (typeof value === "string" && value) return value
    return personName(value)
  }

  async function handleStartTimer() {
    const activeMatterId = id
    const title = String(m.title ?? "Untitled Matter")
    try {
      setStartingTimer(true)
      const timers = getActiveMatterTimers()

      if (Object.keys(timers).length >= MAX_MATTER_TIMERS && !timers[activeMatterId]) {
        toast.warning("A maximum of 3 timers can be created")
        return
      }

      const runningEntry = Object.values(timers).find(t => t.isRunning)
      if (runningEntry && runningEntry.matterId !== activeMatterId) {
        if (!env.USE_STATIC_DATA) {
          await axiosClient.post("/api/activity/stopwatch", null, {
            params: { matterId: runningEntry.matterId, activityTimerStatus: "Pause" },
          }).catch(() => {})
        }
        timers[runningEntry.matterId] = {
          ...runningEntry,
          isRunning: false,
          pause: true,
          pauseStartTime: Date.now(),
        }
      }

      if (env.USE_STATIC_DATA) {
        startStopwatch(activeMatterId, title)
        toast.success("Stopwatch started")
        return
      }

      const response = await axiosClient.post("/api/activity/stopwatch", null, {
        params: { matterId: activeMatterId, activityTimerStatus: "Start" },
      })
      if (response.data?.code === "403") {
        toast.error(response.data?.Msg ?? "Cannot start timer")
        return
      }
      const d = response.data?.data ?? response.data
      timers[activeMatterId] = {
        timerId: d.id,
        matterTitle: d.matterMini?.title || title,
        matterId: activeMatterId,
        isRunning: true,
        pause: false,
        startTime: d.startTime || Date.now(),
        totalPauseTime: 0,
        pauseStartTime: null,
      }
      setActiveMatterTimers(timers)
      setTimers(timers, activeMatterId)
      toast.success("Stopwatch started")
    } catch (error) {
      toast.error((error as { response?: { data?: { Msg?: string } }; message?: string }).response?.data?.Msg
        ?? (error as { message?: string }).message
        ?? "Failed to start timer")
    } finally {
      setStartingTimer(false)
    }
  }

  async function confirmReopen() {
    try {
      const message = await mattersApi.reopen(id)
      toast.success(message)
      qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
      qc.invalidateQueries({ queryKey: ["matters", "list"] })
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to reopen matter")
    }
  }

  return (
    <PageShell
      title={`Matter ${String(m.title ?? m.matterSeq ?? "")}`}
      description={String(m.matterSubject ?? m.description ?? "")}
      breadcrumbs={[{ label: "Matters", path: "/matters" }, { label: String(m.title ?? "Detail") }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {isOpen && (
            <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
              disabled={startingTimer}
              onClick={() => { void handleStartTimer() }}>
              Log Time
            </Button>
          )}
          {isOpen && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setHearingOpen(true)}>Hearing</Button>}
          {isOpen && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setLogTimeOpen(true)}>Time Entry</Button>}
          {canEdit && isOpen && <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>}
          {canEdit && isOpen && (
            <Button
              size="small"
              variant="outlined"
              color={stopWorkingEnabled ? "warning" : "inherit"}
              startIcon={<PauseCircleOutlineOutlinedIcon />}
              onClick={() => setStopWorkingOpen(true)}
            >
              {stopWorkingEnabled ? "Edit Stop Working" : "Stop Working"}
            </Button>
          )}
          {canEdit && isOpen && <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => setCloseOpen(true)}>Close</Button>}
          {canEdit && status === "CLOSE" && <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setReopenOpen(true)}>Reopen</Button>}
          <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.open(`/matters/print?matterId=${matterId}`, "_blank")}>Print</Button>
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "primary.main", color: "white", display: "flex" }}>
              <GavelIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Matter {String(m.title ?? "")}</Typography>
              <Typography variant="body2" color="text.secondary">{String(m.matterSubject ?? "")}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <StatusBadge status={status} />
            {stopWorkingEnabled && <Chip size="small" color="warning" label="Stop Working" />}
            <Chip size="small" label={String(m.billingType ?? "")} variant="outlined" />
            {!!pa && <Chip size="small" label={pa} variant="outlined" />}
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Client</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{cl?.companyName || cl?.firstName || "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Attorney</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{atty ? `${atty.firstName} ${atty.lastName}` : "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Open Date</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(String(m.openDate ?? m.createdAt ?? ""))}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Due Date</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.dueDate ? formatDate(String(m.dueDate)) : "—"}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
        {[
          { l: "Time Logs", v: String(m.totalTimelogs ?? timelogsTimeline.data?.totalElements ?? STL.length) },
          { l: "Invoices", v: String(m.totalInvoices ?? invoicesTimeline.data?.totalElements ?? SI.length) },
          { l: "Pending Tasks", v: String(m.pendingTasks ?? (tasksTimeline.data?.content ?? ST).filter(t => String((t as { taskStatus?: string }).taskStatus) !== "Completed").length) },
        ].map(({ l, v }) => (
          <Paper key={l} variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">{l}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{v}</Typography>
          </Paper>
        ))}
      </Box>

      <Tabs tabs={[
        { label: "Overview", content: <MatterOverview matter={m} matterId={id} /> },
        { label: "Notes", content: <MatterNotesPanel matterId={id} canEdit={canEdit && isOpen} /> },
        {
          label: "Tasks",
          content: (
            <DataGrid
              columns={[
                { field: "taskName", header: "Task Name" },
                { field: "description", header: "Description", renderCell: v => String(v ?? "—") },
                { field: "taskStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "createdBy", header: "Created By", renderCell: v => personName(v) },
                { field: "createdAt", header: "Created At", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "taskDeadLine", header: "Deadline", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["matters", "tasks", matterId]}
              queryFn={(p: GridParams) => mattersApi.getTasks(id, p)}
              detailPath={row => `/tasks/${String((row as { id?: string }).id ?? "")}`}
            />
          ),
        },
        {
          label: "Time Logs",
          content: (
            <DataGrid
              columns={[
                { field: "billable", header: "Billable", renderCell: v => v ? "Yes" : "No" },
                { field: "billingType", header: "Billing Type" },
                {
                  field: "totalHours",
                  header: "Hours",
                  align: "right",
                  renderCell: (_v, row) => activityHours(row as Record<string, unknown>),
                },
                { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                {
                  field: "responsiblePersonName",
                  header: "Responsible Person",
                  renderCell: (v, row) => personOrName(v ?? (row as Record<string, unknown>).responsiblePerson),
                },
                {
                  field: "entryDate",
                  header: "Created Date",
                  renderCell: (v, row) => {
                    const d = v ?? (row as Record<string, unknown>).createdAt
                    return d ? formatDate(String(d)) : "—"
                  },
                },
                { field: "note", header: "Note", renderCell: v => String(v ?? "—") },
                { field: "revenueStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
              ]}
              queryKey={["matters", "timelogs", matterId]}
              queryFn={(p: GridParams) => mattersApi.getTimelogs(id, p)}
            />
          ),
        },
        {
          label: "Logs",
          content: (
            <DataGrid
              columns={[
                { field: "logType", header: "Type", renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).type ?? "—") },
                { field: "logTitle", header: "Title", renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).logDec ?? (row as Record<string, unknown>).title ?? "—") },
                { field: "createdBy", header: "Created By", renderCell: v => personOrName(v) },
                { field: "createdAt", header: "Created At", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["matters", "logs", matterId]}
              queryFn={(p: GridParams) => mattersApi.getLogs(id, p)}
            />
          ),
        },
        {
          label: "Mails",
          content: (
            <DataGrid
              columns={[
                { field: "date", header: "Date", renderCell: (v, row) => {
                  const d = v ?? (row as Record<string, unknown>).receivedDate ?? (row as Record<string, unknown>).createdAt
                  return d ? formatDate(String(d)) : "—"
                }},
                { field: "subject", header: "Subject" },
                { field: "from", header: "From", renderCell: v => Array.isArray(v) ? v.join(", ") : String(v ?? "—") },
                { field: "to", header: "To", renderCell: v => Array.isArray(v) ? v.join(", ") : String(v ?? "—") },
                { field: "cc", header: "CC", renderCell: v => Array.isArray(v) ? v.join(", ") : String(v ?? "—") },
              ]}
              queryKey={["matters", "mails", matterId]}
              queryFn={(p: GridParams) => mattersApi.getMails(id, p)}
              onRowClick={(row) => {
                const r = row as Record<string, unknown>
                const eid = String(r.emailId ?? r.id ?? "")
                if (!eid) return
                navigate(`/matters/${id}/mail/${encodeURIComponent(eid)}?_matterId=${id}`)
              }}
            />
          ),
        },
        {
          label: "Snapshots",
          content: (
            <DataGrid
              columns={[
                { field: "createdAt", header: "Created At", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "createdBy", header: "Created By" },
                { field: "title", header: "Title" },
                { field: "billingType", header: "Billing Type" },
                { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "practiceArea", header: "Practice Area" },
              ]}
              queryKey={["matters", "snapshots", matterId]}
              queryFn={(p: GridParams) => mattersApi.getSnapshots(id, p)}
            />
          ),
        },
        {
          label: "Hearings",
          content: (
            <DataGrid
              columns={[
                { field: "chamberNo", header: "Chamber No", renderCell: v => String(v ?? "—") },
                { field: "hearingDate", header: "Hearing Date", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "hearingTime", header: "Hearing Time" },
                { field: "nextHearingDate", header: "Next Hearing", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "responsibleLawyer", header: "Responsible Lawyer", renderCell: v => personName(v) },
                { field: "attendantLawyer", header: "Attendant Lawyer", renderCell: v => personName(v) },
                { field: "location", header: "Location", renderCell: v => {
                  if (typeof v === "string") return v || "—"
                  const loc = v as { name?: string; locationName?: string } | null
                  return loc?.name ?? loc?.locationName ?? "—"
                }},
                { field: "note", header: "Note", renderCell: v => String(v ?? "—") },
                { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
              ]}
              queryKey={["matters", "hearings", matterId]}
              queryFn={(p: GridParams) => mattersApi.getHearings(id, p)}
              rowMenuItems={row => {
                const r = row as Record<string, unknown>
                const hid = String(r.id ?? "")
                const closed = String(r.status ?? "").toUpperCase().includes("CLOSE")
                return [
                  {
                    label: "Continue",
                    hidden: () => closed,
                    onClick: () => setContinueHearing(r),
                  },
                  {
                    label: "Close",
                    hidden: () => closed || !hid,
                    onClick: () => setCloseHearingId(hid),
                  },
                ]
              }}
            />
          ),
        },
        {
          label: "Projected Hours",
          content: (
            <DataGrid
              columns={[
                { field: "designation", header: "Designation" },
                { field: "projectedHours", header: "Projected Hours", align: "right" },
                { field: "usedHours", header: "Used Hours", align: "right" },
                { field: "balanceHours", header: "Balance", align: "right" },
                { field: "usagePercent", header: "Usage %", align: "right", renderCell: v => `${Number(v ?? 0)}%` },
              ]}
              queryKey={["matters", "projected-hours", matterId]}
              queryFn={(p: GridParams) => mattersApi.getProjectedHours(id, p)}
            />
          ),
        },
        {
          label: "Finance Contacts",
          content: (
            <DataGrid
              columns={[
                { field: "name", header: "Name" },
                { field: "email", header: "Email" },
                { field: "contactNumber", header: "Contact Number" },
                { field: "primary", header: "Primary", renderCell: v => v ? "Yes" : "No" },
              ]}
              queryKey={["matters", "finance-contacts", matterId]}
              queryFn={(p: GridParams) => mattersApi.getFinanceContacts(id, p)}
            />
          ),
        },
        {
          label: "Invoices",
          content: (
            <DataGrid
              columns={[
                {
                  field: "taxInvoiceNo",
                  header: "Tax Invoice No",
                  renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).invoiceNo ?? "—"),
                },
                {
                  field: "invoiceBillingType",
                  header: "Billing Type",
                  renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).billingType ?? "—"),
                },
                {
                  field: "dueAmount",
                  header: "Amount Due",
                  align: "right",
                  renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).taxableAmount ?? 0)),
                },
                { field: "paidAmount", header: "Paid", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                {
                  field: "balanceAmount",
                  header: "Balance",
                  align: "right",
                  renderCell: (v, row) => {
                    const r = row as Record<string, unknown>
                    const due = Number(r.dueAmount ?? r.taxableAmount ?? 0)
                    const paid = Number(r.paidAmount ?? 0)
                    return formatCurrency(Number(v ?? (due - paid)))
                  },
                },
                {
                  field: "paymentStaus",
                  header: "Payment Status",
                  renderCell: (v, row) => <StatusBadge status={String(v ?? (row as Record<string, unknown>).invoiceStatus ?? "")} />,
                },
                { field: "issueDate", header: "Created Date", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "dueDate", header: "Due Date", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["matters", "invoices", matterId]}
              queryFn={(p: GridParams) => mattersApi.getInvoices(id, p)}
              detailPath={row => `/billings/${String((row as { id?: string }).id ?? "")}`}
              rowMenuItems={row => {
                const invId = String((row as { id?: string }).id ?? "")
                return [
                  { label: "Record Payment", onClick: () => { window.location.href = `/payment?invoiceId=${invId}` } },
                ]
              }}
            />
          ),
        },
        {
          label: "Financials",
          content: <MatterFinancialsTab matterId={id} />,
        },
        {
          label: "Timeline",
          content: (
            <MatterTimeline
              matter={m}
              hearings={(hearingsTimeline.data?.content ?? SH) as Record<string, unknown>[]}
              tasks={(tasksTimeline.data?.content ?? ST) as Record<string, unknown>[]}
              timelogs={(timelogsTimeline.data?.content ?? STL) as Record<string, unknown>[]}
              invoices={(invoicesTimeline.data?.content ?? SI) as Record<string, unknown>[]}
            />
          ),
        },
        {
          label: "Documents",
          content: <DocumentsTab relatedTo="MATTER" relatedToId={id} />,
        },
        {
          label: "Conflict Check",
          content: (
            <DataGrid
              columns={[
                { field: "partyName", header: "Party", renderCell: (v, row) => String(v ?? (row as { name?: string }).name ?? (row as { matchedName?: string }).matchedName ?? "—") },
                { field: "matchType", header: "Match Type", renderCell: v => String(v || "—") },
                { field: "status", header: "Status", renderCell: (v, row) => <StatusBadge status={String(v ?? (row as { risk?: string }).risk ?? "")} /> },
                { field: "details", header: "Details", renderCell: v => String(v || "—") },
              ]}
              queryKey={["matters", "conflict", matterId]}
              queryFn={(p: GridParams) => mattersApi.getConflictChecks(id, p)}
              zebraStriping
            />
          ),
        },
      ]} />

      <ActivityFormDrawer
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        prefillMatterId={id}
        onSuccess={() => {
          setLogTimeOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "timelogs", matterId] })
          toast.success("Time entry saved")
        }}
      />
      <HearingFormDrawer
        open={hearingOpen}
        onClose={() => setHearingOpen(false)}
        matterId={id}
        onSuccess={() => {
          setHearingOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
          toast.success("Hearing scheduled")
        }}
      />
      <ContinueHearingDrawer
        open={!!continueHearing}
        onClose={() => setContinueHearing(null)}
        matterId={id}
        hearing={continueHearing}
        onSuccess={() => {
          setContinueHearing(null)
          qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
          toast.success("Hearing continued")
        }}
      />
      <CloseHearingDrawer
        open={!!closeHearingId}
        onClose={() => setCloseHearingId(null)}
        matterId={id}
        hearingId={closeHearingId ?? ""}
        onSuccess={() => {
          setCloseHearingId(null)
          qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
          toast.success("Hearing closed")
        }}
      />
      <MatterCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        matterId={id}
        matterTitle={String(m.title ?? "")}
        responsibleAttorneyId={String((m.responsibleAttorney as { id?: string } | null)?.id ?? m.responsibleAttorneyId ?? "")}
        onClosed={() => qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })}
      />
      <MatterFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        matterId={id}
        onSuccess={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
          toast.success("Matter updated")
        }}
      />
      <StopWorkingDrawer
        open={stopWorkingOpen}
        onClose={() => setStopWorkingOpen(false)}
        matterId={id}
        current={{
          enabled: stopWorkingEnabled,
          reasonId: String(stopWorking?.matterStopWorkingReasonId ?? m.stopWorkingReasonId ?? ""),
        }}
        onSuccess={() => {
          setStopWorkingOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
          toast.success("Stop working updated")
        }}
      />
      <ConfirmDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={confirmReopen}
        title="Reopen Matter"
        message="Are you sure you want to reopen this matter?"
        confirmLabel="Reopen"
      />
    </PageShell>
  )
}
