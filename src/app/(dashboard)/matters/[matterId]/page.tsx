import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Alert, Box, Typography, Paper, Chip, Button, Divider,
  Dialog, DialogActions, DialogContent, DialogTitle,
} from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import AddIcon from "@mui/icons-material/Add"
import CloseIcon from "@mui/icons-material/Close"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import PrintIcon from "@mui/icons-material/Print"
import EditIcon from "@mui/icons-material/Edit"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import EventAvailableIcon from "@mui/icons-material/EventAvailable"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined"
import GavelIcon from "@mui/icons-material/Gavel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { mattersApi } from "@/api/matters"
import { adminApi } from "@/api/admin"
import { saveHearingToOutlook } from "@/lib/outlook/calendar"
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
import { TaskFormDrawer } from "../../tasks/_components/TaskFormDrawer"
import { MultiStepTaskFormDrawer } from "../../tasks/multi-step/_components/MultiStepTaskFormDrawer"
import LinkIcon from "@mui/icons-material/Link"
import { MatterActivationMenu } from "../_components/MatterActivationMenu"
import { MatterBreakdownDialog } from "../_components/MatterBreakdownDialog"
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { StopWorkingDrawer } from "../_components/StopWorkingDrawer"
import { MatterFinancialsTab } from "../_components/MatterFinancialsTab"
import { MatterHourlyRatesTab } from "../_components/MatterHourlyRatesTab"
import { MatterProjectedHoursTab } from "../_components/MatterProjectedHoursTab"
import { MatterFinanceContactDrawer, type MatterFinanceContactFormValues } from "../_components/MatterFinanceContactDrawer"
import { MatterConflictTab } from "../_components/MatterConflictTab"
import { InvoiceSendEmailDialog } from "../../billings/_components/InvoiceSendEmailDialog"
import { CancelWithCreditDialog } from "../../billings/_components/CancelWithCreditDialog"
import { billingApi } from "@/api/billing"
import PaidIcon from "@mui/icons-material/Paid"
import CancelIcon from "@mui/icons-material/Cancel"
import EmailIcon from "@mui/icons-material/Email"
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined"
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
import { useSowMatterFilter } from "../_components/MatterSowFilter"

function personName(value: unknown): string {
  const p = value as { firstName?: string; lastName?: string } | null
  return p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—" : "—"
}

function locName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const loc = v as { name?: string; locationName?: string } | null
  return loc?.name ?? loc?.locationName ?? "—"
}

function hearingIdOf(row: Record<string, unknown>): string {
  return String(row.hearingId ?? row.id ?? "")
}

function MatterHearingsTab({
  parentMatterId,
  oneDriveEnabled,
  onEdit,
  onContinue,
  onClose,
  onOutlook,
}: {
  parentMatterId: string
  oneDriveEnabled: boolean
  onEdit: (row: Record<string, unknown>) => void
  onContinue: (row: Record<string, unknown>) => void
  onClose: (hearingId: string) => void
  onOutlook: (row: Record<string, unknown>) => void
}) {
  const navigate = useNavigate()
  const { scopedMatterId, filterEl } = useSowMatterFilter(parentMatterId)
  return (
    <Box>
      {filterEl}
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
        queryKey={["matters", "hearings", parentMatterId, scopedMatterId]}
        queryFn={(p: GridParams) => mattersApi.getHearings(scopedMatterId, p)}
        detailPath={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = String(r.matterId ?? scopedMatterId ?? parentMatterId)
          if (!hid) return `/matters/${parentMatterId}`
          return `/hearings/${hid}?matterId=${encodeURIComponent(mid)}`
        }}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const hid = hearingIdOf(r)
          const mid = String(r.matterId ?? scopedMatterId ?? parentMatterId)
          const closed = String(r.status ?? "").toUpperCase().includes("CLOSE")
          const hasMeeting = Boolean(r.meetingId)
          return [
            {
              label: "Details",
              icon: <InfoOutlinedIcon fontSize="small" />,
              hidden: () => !hid,
              onClick: () => navigate(`/hearings/${hid}?matterId=${encodeURIComponent(mid)}`),
            },
            {
              label: "Edit",
              icon: <EditOutlinedIcon fontSize="small" />,
              hidden: () => closed || !hid,
              onClick: () => onEdit(r),
            },
            {
              label: "Continue",
              hidden: () => closed,
              onClick: () => onContinue(r),
            },
            {
              label: "Close",
              hidden: () => closed || !hid,
              onClick: () => onClose(hid),
            },
            {
              label: "Save to Outlook",
              icon: <EventAvailableIcon fontSize="small" />,
              hidden: () => !oneDriveEnabled || hasMeeting || !hid || closed,
              onClick: () => onOutlook(r),
            },
          ]
        }}
      />
    </Box>
  )
}

function MatterInvoicesTab({
  parentMatterId,
  gridKey,
  onOpenDetail,
  onSendEmail,
  onRecordPayment,
  onCancel,
  onCancelCredit,
  onWriteOff,
}: {
  parentMatterId: string
  gridKey: number
  onOpenDetail: (invoiceId: string) => void
  onSendEmail: (target: { id: string; emails: string[] }) => void
  onRecordPayment: (invoiceId: string) => void
  onCancel: (invoiceId: string) => void
  onCancelCredit: (invoiceId: string) => void
  onWriteOff: (invoiceId: string) => void
}) {
  const { scopedMatterId, filterEl } = useSowMatterFilter(parentMatterId)
  return (
    <Box>
      {filterEl}
      <DataGrid
        key={gridKey}
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
        queryKey={["matters", "invoices", parentMatterId, scopedMatterId]}
        queryFn={(p: GridParams) => mattersApi.getInvoices(scopedMatterId, p)}
        detailPath={row => `/billings/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const r = row as Record<string, unknown> & { id?: string }
          const invId = String(r.id ?? "")
          const client = (r.client ?? r.clientMini) as Record<string, unknown> | undefined
          const rawEmails = (client?.email ?? client?.emails ?? r.clientEmails ?? []) as unknown
          const list = Array.isArray(rawEmails) ? rawEmails : typeof rawEmails === "string" && rawEmails ? [rawEmails] : []
          const emails = Array.from(new Set(list.map(e => {
            if (typeof e === "string") return e.trim()
            const o = e as { emailId?: string; email?: string }
            return String(o.emailId ?? o.email ?? "").trim()
          }).filter(Boolean)))
          return [
            {
              label: "Open detail",
              icon: <VisibilityOutlinedIcon fontSize="small" />,
              onClick: () => onOpenDetail(invId),
            },
            {
              label: "Send Email",
              icon: <EmailIcon fontSize="small" />,
              onClick: () => onSendEmail({ id: invId, emails }),
            },
            {
              label: "Record Payment",
              icon: <PaidIcon fontSize="small" />,
              onClick: () => onRecordPayment(invId),
            },
            {
              label: "Cancel",
              icon: <CancelIcon fontSize="small" />,
              onClick: () => onCancel(invId),
            },
            {
              label: "Cancel (Credit/Refund)",
              onClick: () => onCancelCredit(invId),
            },
            {
              label: "Write Off",
              onClick: () => onWriteOff(invId),
            },
          ]
        }}
      />
    </Box>
  )
}

export default function MatterDetailPage() {
  const { t } = useTranslation()
  const { matterId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const startStopwatch = useStopwatchStore(s => s.start)
  const setTimers = useStopwatchStore(s => s.setTimers)
  const canEdit = useAuthStore(s => s.hasPermission)("/matters")
  const matterLabel = t("pages.matter", "Matter")
  const mattersListLabel = t("nav.matters")
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [hearingOpen, setHearingOpen] = useState(false)
  const [continueHearing, setContinueHearing] = useState<Record<string, unknown> | null>(null)
  const [closeHearingId, setCloseHearingId] = useState<string | null>(null)
  const [editHearing, setEditHearing] = useState<Record<string, unknown> | null>(null)
  const [outlookHearing, setOutlookHearing] = useState<Record<string, unknown> | null>(null)
  const [outlookSaving, setOutlookSaving] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [stopWorkingOpen, setStopWorkingOpen] = useState(false)
  const [startingTimer, setStartingTimer] = useState(false)
  const [attachingMail, setAttachingMail] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [multiTaskOpen, setMultiTaskOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [financeContact, setFinanceContact] = useState<MatterFinanceContactFormValues | null>(null)
  const [deleteFinanceId, setDeleteFinanceId] = useState<string | null>(null)
  const [invoiceCancelId, setInvoiceCancelId] = useState<string>()
  const [invoiceCancelCreditId, setInvoiceCancelCreditId] = useState<string>()
  const [invoiceWriteOffId, setInvoiceWriteOffId] = useState<string>()
  const [invoiceEmailTarget, setInvoiceEmailTarget] = useState<{ id: string; emails: string[] }>()
  const [invoiceGridKey, setInvoiceGridKey] = useState(0)

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
  const stopWorkingReasonsQuery = useQuery({
    queryKey: ["matters", "stop-working-reasons"],
    queryFn: () => mattersApi.getStopWorkingReasons(),
    enabled: !!matterId,
  })
  const companyQ = useQuery({
    queryKey: ["company", "info", "oneDrive"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
    staleTime: 5 * 60_000,
  })
  const oneDriveEnabled = Boolean(companyQ.data?.oneDrive)
  const outlookUsersQ = useQuery({
    queryKey: ["admin", "users", "mini", "outlook", "matter-detail"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: oneDriveEnabled,
    staleTime: 5 * 60_000,
  })
  const outlookLocationsQ = useQuery({
    queryKey: ["lookups", "locations", "outlook", "matter-detail"],
    queryFn: () => adminApi.getLocations(),
    enabled: oneDriveEnabled,
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <PageShell title={matterLabel}><DetailSkeleton /></PageShell>
  if (isError || !matter) {
    return (
      <PageShell title={matterLabel} breadcrumbs={[{ label: mattersListLabel, path: "/matters" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Matter not found.</Typography>
      </PageShell>
    )
  }

  const m = matter as Record<string, unknown>
  const status = String(m.status ?? "")
  const isOpen = status === "OPEN" || status === "RE_OPEN"
  const atty = m.responsibleAttorney as { firstName?: string; lastName?: string } | null
  const cl = (m.client ?? m.clientMini) as { id?: string; companyName?: string; firstName?: string } | null
  const clientId = String(cl?.id ?? m.clientId ?? "")
  const pa = (m.practiceArea as { name?: string })?.name ?? ""
  const id = String(m.matterId ?? matterId ?? "")
  const lfa = (m.lfa ?? {}) as Record<string, unknown>
  const showBreakdown = Boolean(lfa.breakDown ?? lfa.breakdown ?? m.breakDown)
  const stopWorking = m.matterStopWorking as {
    matterStopWorkingEnabled?: boolean
    matterStopWorkingReasonId?: string
    matterStopWorkingReason?: string
  } | null
  const stopWorkingEnabled = !!(stopWorking?.matterStopWorkingEnabled ?? m.stopWorkingEnabled)
  const stopWorkingReasonId = String(
    stopWorking?.matterStopWorkingReasonId ?? m.stopWorkingReasonId ?? "",
  )
  const stopWorkingReasonName = String(
    stopWorking?.matterStopWorkingReason
    ?? m.stopWorkingReason
    ?? stopWorkingReasonsQuery.data?.find(r => r.id === stopWorkingReasonId)?.name
    ?? "",
  )
  const stopWorkingReasonLabel = stopWorkingReasonName || stopWorkingReasonId || "—"

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

  async function confirmDeleteFinance() {
    if (!deleteFinanceId) return
    try {
      await mattersApi.deleteFinanceContact(deleteFinanceId)
      toast.success("Finance contact deleted")
      qc.invalidateQueries({ queryKey: ["matters", "finance-contacts", matterId] })
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to delete finance contact")
    } finally {
      setDeleteFinanceId(null)
    }
  }

  function openFinanceCreate() {
    setFinanceContact(null)
    setFinanceOpen(true)
  }

  function openFinanceEdit(row: Record<string, unknown>) {
    setFinanceContact({
      id: String(row.id ?? row._id ?? ""),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      contactNumber: String(row.contactNumber ?? ""),
      primary: Boolean(row.primary),
    })
    setFinanceOpen(true)
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

  async function confirmSaveOutlook() {
    if (!outlookHearing || outlookSaving) return
    setOutlookSaving(true)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
        toast.success("Saved to Outlook successfully")
      } else {
        const attorneys = ((outlookUsersQ.data ?? []) as Record<string, unknown>[]).map(u => ({
          id: String(u.id ?? ""),
          firstName: String(u.firstName ?? ""),
          lastName: String(u.lastName ?? ""),
          email: String(u.email ?? ""),
        }))
        const locations = ((outlookLocationsQ.data ?? []) as Record<string, unknown>[]).map(l => ({
          id: String(l.id ?? ""),
          name: String(l.name ?? ""),
        }))
        const hid = hearingIdOf(outlookHearing)
        const locRaw = outlookHearing.hearingLocation ?? outlookHearing.location
        await saveHearingToOutlook(
          {
            ...outlookHearing,
            id: hid,
            hearingId: hid,
            hearingLocation: typeof locRaw === "string" || (locRaw && typeof locRaw === "object")
              ? locRaw as string | { id?: string; name?: string }
              : undefined,
            matterName: String(m.title ?? outlookHearing.matterTitle ?? ""),
            clientName: cl?.companyName || cl?.firstName || undefined,
          },
          attorneys,
          locations,
        )
        toast.success("Saved to Outlook successfully")
        qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
      }
      setOutlookHearing(null)
    } catch {
      toast.error("Failed to save to Outlook")
    } finally {
      setOutlookSaving(false)
    }
  }

  return (
    <PageShell
      title={`${matterLabel} ${String(m.title ?? m.matterSeq ?? "")}`}
      description={String(m.matterSubject ?? m.description ?? "")}
      breadcrumbs={[{ label: mattersListLabel, path: "/matters" }, { label: String(m.title ?? "Detail") }]}
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
          {isOpen && (
            <Button size="small" variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => setExpenseOpen(true)}>
              New Expense
            </Button>
          )}
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
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkIcon />}
              disabled={attachingMail}
              onClick={async () => {
                if (!matterId) return
                setAttachingMail(true)
                try {
                  toast.success(await mattersApi.attachMailbox(matterId))
                  qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
                  qc.invalidateQueries({ queryKey: ["matters", "mails", matterId] })
                } catch {
                  toast.error("Failed to attach mailbox")
                } finally {
                  setAttachingMail(false)
                }
              }}
            >
              Attach Mailbox
            </Button>
          )}
        </Box>
      )}
    >
      {stopWorkingEnabled && (
        <Alert severity="error" variant="filled" sx={{ mb: 2 }}>
          This matter has been marked as &quot;Stop Working&quot; due to: {stopWorkingReasonLabel}
        </Alert>
      )}
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
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={status} />
            {stopWorkingEnabled && <Chip size="small" color="warning" label="Stop Working" />}
            <Chip size="small" label={String(m.billingType ?? "")} variant="outlined" />
            {!!pa && <Chip size="small" label={pa} variant="outlined" />}
            {canEdit && isOpen && <MatterActivationMenu matter={m} matterId={id} />}
            {canEdit && isOpen && showBreakdown && (
              <Button
                size="small"
                variant="contained"
                startIcon={<AccountTreeOutlinedIcon />}
                onClick={() => setBreakdownOpen(true)}
              >
                Breakdown
              </Button>
            )}
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
        { label: "Overview", content: <MatterOverview matter={m} matterId={id} canEdit={canEdit && isOpen} /> },
        { label: "Notes", content: <MatterNotesPanel matterId={id} canEdit={canEdit && isOpen} /> },
        {
          label: "Tasks",
          content: (
            <Box>
              {canEdit && isOpen && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setTaskOpen(true)}>
                    New Task
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setMultiTaskOpen(true)}>
                    Multi-level Task
                  </Button>
                </Box>
              )}
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
            </Box>
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
            <MatterHearingsTab
              parentMatterId={id}
              oneDriveEnabled={oneDriveEnabled}
              onEdit={setEditHearing}
              onContinue={setContinueHearing}
              onClose={setCloseHearingId}
              onOutlook={setOutlookHearing}
            />
          ),
        },
        {
          label: "Projected Hours",
          content: <MatterProjectedHoursTab matterId={id} canEdit={canEdit && isOpen} />,
        },
        {
          label: "Hourly Rates",
          content: <MatterHourlyRatesTab matterId={id} canEdit={canEdit && isOpen} />,
        },
        {
          label: "Finance Contacts",
          content: (
            <Box>
              {canEdit && isOpen && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openFinanceCreate}>
                    Add Contact
                  </Button>
                </Box>
              )}
              <DataGrid
                columns={[
                  { field: "name", header: "Name" },
                  { field: "email", header: "Email" },
                  { field: "contactNumber", header: "Contact Number" },
                  { field: "primary", header: "Primary", renderCell: v => v ? "Yes" : "No" },
                ]}
                queryKey={["matters", "finance-contacts", matterId]}
                queryFn={(p: GridParams) => mattersApi.getFinanceContacts(id, p)}
                zebraStriping
                rowMenuItems={row => {
                  if (!(canEdit && isOpen)) return []
                  const r = row as Record<string, unknown>
                  return [
                    {
                      label: "Edit",
                      icon: <EditOutlinedIcon fontSize="small" />,
                      onClick: () => openFinanceEdit(r),
                    },
                    {
                      label: "Delete",
                      icon: <DeleteOutlinedIcon fontSize="small" />,
                      color: "error",
                      onClick: () => setDeleteFinanceId(String(r.id ?? r._id ?? "")),
                    },
                  ]
                }}
              />
            </Box>
          ),
        },
        {
          label: "Invoices",
          content: (
            <MatterInvoicesTab
              parentMatterId={id}
              gridKey={invoiceGridKey}
              onOpenDetail={invId => navigate(`/billings/${invId}`)}
              onSendEmail={setInvoiceEmailTarget}
              onRecordPayment={invId => navigate(`/payment?invoiceId=${invId}`)}
              onCancel={setInvoiceCancelId}
              onCancelCredit={setInvoiceCancelCreditId}
              onWriteOff={setInvoiceWriteOffId}
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
          content: <MatterConflictTab matterId={id} canEdit={canEdit && isOpen} />,
        },
      ]} />

      <ActivityFormDrawer
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        prefillMatterId={id}
        prefillClientId={clientId || undefined}
        onSuccess={() => {
          setLogTimeOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "timelogs", matterId] })
          toast.success("Time entry saved")
        }}
      />
      <ActivityFormDrawer
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        prefillMatterId={id}
        prefillClientId={clientId || undefined}
        defaultActivityType="Expense"
        onSuccess={() => {
          setExpenseOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "timelogs", matterId] })
          toast.success("Expense saved")
        }}
      />
      <TaskFormDrawer
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        prefillEventType="MATTER"
        prefillEventTypeId={id}
        onSuccess={() => {
          setTaskOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "tasks", matterId] })
          toast.success("Task created")
        }}
      />
      <MultiStepTaskFormDrawer
        open={multiTaskOpen}
        onClose={() => setMultiTaskOpen(false)}
        taskType="MATTER"
        taskTypeId={id}
        onSuccess={() => {
          setMultiTaskOpen(false)
          qc.invalidateQueries({ queryKey: ["matters", "tasks", matterId] })
          toast.success("Multi-level task created")
        }}
      />
      <MatterFinanceContactDrawer
        open={financeOpen}
        onClose={() => { setFinanceOpen(false); setFinanceContact(null) }}
        matterId={id}
        contact={financeContact}
        onSuccess={mode => {
          setFinanceOpen(false)
          setFinanceContact(null)
          qc.invalidateQueries({ queryKey: ["matters", "finance-contacts", matterId] })
          toast.success(mode === "update" ? "Finance contact updated" : "Finance contact added")
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
      <HearingFormDrawer
        open={!!editHearing}
        onClose={() => setEditHearing(null)}
        matterId={id}
        hearingId={editHearing ? hearingIdOf(editHearing) : undefined}
        initial={editHearing ? {
          caseNo: String(editHearing.caseNo ?? ""),
          hearingDate: String(editHearing.hearingDate ?? editHearing.nextHearingDate ?? "").slice(0, 10),
          hearingTime: String(editHearing.hearingTime ?? ""),
          location: locName(editHearing.hearingLocation ?? editHearing.location),
          hearingType: String(
            (editHearing.hearingsType as { name?: string } | undefined)?.name
            ?? editHearing.hearingType
            ?? "",
          ),
          notes: String(editHearing.note ?? editHearing.notes ?? ""),
        } : undefined}
        onSuccess={() => {
          setEditHearing(null)
          qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
          toast.success("Hearing updated")
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
      <Dialog open={!!outlookHearing} onClose={() => !outlookSaving && setOutlookHearing(null)}>
        <DialogTitle>Save Hearing in Outlook Calendar</DialogTitle>
        <DialogContent>
          Are you sure you want to save this hearing as an Outlook meeting?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutlookHearing(null)} disabled={outlookSaving}>Cancel</Button>
          <Button variant="contained" disabled={outlookSaving} onClick={() => { void confirmSaveOutlook() }}>
            {outlookSaving ? "Saving…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
      <MatterCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        matterId={id}
        matterTitle={String(m.title ?? "")}
        responsibleAttorneyId={String((m.responsibleAttorney as { id?: string } | null)?.id ?? m.responsibleAttorneyId ?? "")}
        onClosed={() => qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })}
      />
      <MatterBreakdownDialog
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        matterId={id}
        matter={m}
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
      <ConfirmDialog
        open={!!deleteFinanceId}
        onClose={() => setDeleteFinanceId(null)}
        onConfirm={confirmDeleteFinance}
        title="Delete Finance Contact"
        message="Are you sure you want to delete this finance contact?"
        confirmLabel="Delete"
        severity="error"
      />
      <ConfirmDialog
        open={!!invoiceCancelId}
        onClose={() => setInvoiceCancelId(undefined)}
        onConfirm={async () => {
          toast.success(await billingApi.cancel(String(invoiceCancelId)))
          setInvoiceGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["matters", "invoices", matterId] })
        }}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice?"
        confirmLabel="Cancel Invoice"
        severity="error"
      />
      <ConfirmDialog
        open={!!invoiceWriteOffId}
        onClose={() => setInvoiceWriteOffId(undefined)}
        onConfirm={async () => {
          toast.success(await billingApi.writeOff(String(invoiceWriteOffId)))
          setInvoiceGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["matters", "invoices", matterId] })
        }}
        title="Write Off Invoice"
        message="Are you sure you want to write off this invoice?"
        confirmLabel="Write Off"
        severity="warning"
      />
      <InvoiceSendEmailDialog
        open={!!invoiceEmailTarget}
        invoiceId={String(invoiceEmailTarget?.id ?? "")}
        suggestedEmails={invoiceEmailTarget?.emails ?? []}
        onClose={() => setInvoiceEmailTarget(undefined)}
        onSent={() => setInvoiceEmailTarget(undefined)}
      />
      <CancelWithCreditDialog
        open={!!invoiceCancelCreditId}
        invoiceId={String(invoiceCancelCreditId ?? "")}
        onClose={() => setInvoiceCancelCreditId(undefined)}
        onDone={() => {
          setInvoiceCancelCreditId(undefined)
          setInvoiceGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["matters", "invoices", matterId] })
        }}
      />
    </PageShell>
  )
}
