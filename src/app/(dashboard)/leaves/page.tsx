import { useEffect, useState } from "react"
import { Alert, Box, Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { Link as RouterLink } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { leavesApi } from "@/api/leaves"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"

type LeaveForm = {
  fromDate: string
  toDate: string
  leaveTypeId: string
  description: string
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
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title="My Leaves"
      description="Your leave applications"
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
            renderCell: (_v, row) => {
              const t = (row as Record<string, unknown>).leaveType as { type?: string } | undefined
              return String(t?.type ?? "—")
            },
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
        zebraStriping
      />
      <ApplyLeaveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["leaves"] })
          setGridKey(k => k + 1)
        }}
      />
    </PageShell>
  )
}
