import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { Link as RouterLink } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { StatusFilter } from "@components/filters/StatusFilter"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { leavesApi } from "@/api/leaves"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import type { FilterPanelProps } from "@components/data-grid/types"
import type { GridParams } from "@/types/common.types"

type LeaveForm = {
  fromDate: string
  toDate: string
  leaveTypeId: string
  description: string
}

const LEAVE_STATUS_OPTIONS = [
  { value: "Submitted", label: "Submitted" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
]

function LeaveStatusFilterPanel({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>(filters)
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <StatusFilter
        label="Status"
        value={String(f.leaveStatus ?? "All")}
        onChange={v => setF(p => ({ ...p, leaveStatus: v }))}
        options={LEAVE_STATUS_OPTIONS}
        includeAll
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Clear</Button>
    </Box>
  )
}

function leaveTypeLabel(row: Record<string, unknown>): string {
  const t = row.leaveType as { type?: string } | undefined
  return String(t?.type ?? "—")
}

function ApplyLeaveDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const userId = useAuthStore(s => s.user?.id ?? "")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<LeaveForm>({
    defaultValues: { fromDate: "", toDate: "", leaveTypeId: "", description: "" },
  })

  const { data: types = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => leavesApi.getLeaveTypes(),
    enabled: open,
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function onSubmit(data: LeaveForm) {
    setSubmitError(null)
    if (!data.fromDate || !data.toDate) { setSubmitError("From and to dates are required"); return }
    if (!data.leaveTypeId) { setSubmitError("Leave type is required"); return }
    if (data.toDate < data.fromDate) { setSubmitError("To date can't be before from date"); return }
    try {
      toast.success(await leavesApi.apply({
        fromDate: data.fromDate,
        toDate: data.toDate,
        leaveTypeId: data.leaveTypeId,
        description: data.description,
        leaveTakenBy: userId,
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to apply leave",
      )
    }
  }

  const typeOpts = (types as Record<string, string>[]).map(t => ({
    value: String(t.id),
    label: String(t.type ?? t.name ?? t.id),
  }))

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Apply Leave"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Submit"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Leave Request">
        <ControlledDatePicker name="fromDate" control={control} label="From Date" required />
        <ControlledDatePicker name="toDate" control={control} label="To Date" required />
        <ControlledSelect name="leaveTypeId" control={control} label="Leave Type" options={typeOpts} required />
        <ControlledInput name="description" control={control} label="Description" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}

export default function MyLeavesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  return (
    <PageShell
      title={t("nav.myLeaves")}
      description={t("pages.myLeavesDesc")}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button component={RouterLink} to="/leave-applications" variant="outlined">
            Applications
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
            Apply Leave
          </Button>
        </Box>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "fromDate", header: "From", renderCell: v => formatDate(String(v ?? "")) },
          { field: "toDate", header: "To", renderCell: v => formatDate(String(v ?? "")) },
          {
            field: "leaveTypeId",
            header: "Leave Type",
            renderCell: (_v, row) => leaveTypeLabel(row as Record<string, unknown>),
          },
          { field: "description", header: "Description", renderCell: v => String(v || "—") },
          {
            field: "leaveStatus",
            header: "Status",
            renderCell: v => <StatusBadge status={String(v ?? "")} />,
          },
        ]}
        queryKey={["leaves", "mine"]}
        queryFn={(p: GridParams) => leavesApi.getMyLeaves(p)}
        hasFilters
        FilterPanel={LeaveStatusFilterPanel}
        zebraStriping
        onRowClick={row => setDetail(row as Record<string, unknown>)}
        rowMenuItems={row => [
          {
            label: "Details",
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => setDetail(row as Record<string, unknown>),
          },
        ]}
      />
      <ApplyLeaveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["leaves"] })
          setGridKey(k => k + 1)
        }}
      />
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Leave Details</DialogTitle>
        <DialogContent>
          {detail && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 0.5 }}>
              <Typography variant="body2"><strong>Type:</strong> {leaveTypeLabel(detail)}</Typography>
              <Typography variant="body2">
                <strong>From:</strong> {formatDate(String(detail.fromDate ?? ""))}
              </Typography>
              <Typography variant="body2">
                <strong>To:</strong> {formatDate(String(detail.toDate ?? ""))}
              </Typography>
              <Typography variant="body2"><strong>Description:</strong> {String(detail.description || "—")}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" component="span"><strong>Status:</strong></Typography>
                <StatusBadge status={String(detail.leaveStatus ?? "")} />
              </Box>
              {detail.note != null && String(detail.note).trim() !== "" && (
                <Typography variant="body2"><strong>Remarks:</strong> {String(detail.note)}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
