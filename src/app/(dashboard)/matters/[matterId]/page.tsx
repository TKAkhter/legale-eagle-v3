import { useState } from "react"
import { useParams } from "react-router-dom"
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
import { MatterTimeline } from "../_components/MatterTimeline"
import { MatterOverview } from "../_components/MatterOverview"
import { MatterNotesPanel } from "../_components/MatterNotesPanel"
import { MatterCloseDialog } from "../_components/MatterCloseDialog"
import { MatterFormDrawer } from "../_components/MatterFormDrawer"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"
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
  const qc = useQueryClient()
  const startStopwatch = useStopwatchStore(s => s.start)
  const setTimers = useStopwatchStore(s => s.setTimers)
  const canEdit = useAuthStore(s => s.hasPermission)("/matters")
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [hearingOpen, setHearingOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
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
  const cl = m.client as { companyName?: string; firstName?: string } | null
  const pa = (m.practiceArea as { name?: string })?.name ?? ""
  const id = String(m.matterId ?? matterId ?? "")

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

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, mb: 3 }}>
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
                { field: "totalHours", header: "Hours", align: "right", renderCell: v => `${Number(v ?? 0).toFixed(1)}` },
                { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                { field: "responsiblePerson", header: "Responsible Person", renderCell: v => personName(v) },
                { field: "entryDate", header: "Created Date", renderCell: v => v ? formatDate(String(v)) : "—" },
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
                { field: "type", header: "Type" },
                { field: "title", header: "Title" },
                { field: "action", header: "Action" },
                { field: "hours", header: "Hours/Units" },
                { field: "fieldChanged", header: "Field Changed" },
                { field: "fromValue", header: "From" },
                { field: "toValue", header: "To" },
                { field: "createdBy", header: "Created By" },
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
                { field: "date", header: "Date", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "subject", header: "Subject" },
                { field: "from", header: "From" },
                { field: "to", header: "To" },
                { field: "cc", header: "CC", renderCell: v => String(v ?? "—") },
              ]}
              queryKey={["matters", "mails", matterId]}
              queryFn={(p: GridParams) => mattersApi.getMails(id, p)}
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
                { field: "location", header: "Location", renderCell: v => String(v ?? "—") },
                { field: "note", header: "Note", renderCell: v => String(v ?? "—") },
                { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
              ]}
              queryKey={["matters", "hearings", matterId]}
              queryFn={(p: GridParams) => mattersApi.getHearings(id, p)}
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
                { field: "invoiceNo", header: "Tax Invoice No" },
                { field: "billingType", header: "Billing Type", renderCell: v => String(v ?? "—") },
                { field: "taxableAmount", header: "Amount Due", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                { field: "paidAmount", header: "Paid", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                { field: "balanceAmount", header: "Balance", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                { field: "invoiceStatus", header: "Payment Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "issueDate", header: "Created Date", renderCell: v => v ? formatDate(String(v)) : "—" },
                { field: "dueDate", header: "Due Date", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["matters", "invoices", matterId]}
              queryFn={(p: GridParams) => mattersApi.getInvoices(id, p)}
              detailPath={row => `/billings/${String((row as { id?: string }).id ?? "")}`}
            />
          ),
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
      <MatterCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        matterId={id}
        matterTitle={String(m.title ?? "")}
        onClosed={() => qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })}
      />
      <MatterFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        matterId={String(m.id ?? id)}
        onSuccess={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
          toast.success("Matter updated")
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
