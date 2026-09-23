import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Box, Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { formatDate } from "@lib/utils/formatDate"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const STATIC = [
  { id: "h1", hearingTitle: "Case Management Conference", matterTitle: "260303 — Building Dispute", hearingDate: "2026-09-25", location: "Dubai Courts", status: "Scheduled" },
  { id: "h2", hearingTitle: "Witness Examination", matterTitle: "260293 — Rental Dispute", hearingDate: "2026-09-28", location: "Abu Dhabi Judicial Dept", status: "Scheduled" },
]

async function fetchUpcoming(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    return { content: STATIC, totalElements: STATIC.length, totalPages: 1, number: 0, size: STATIC.length, first: true, last: true, empty: false }
  }
  const r = await axiosClient.get("/api/hearing/for/attorney")
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

type HearingForm = {
  matterId: string
  caseNo: string
  hearingDate: string
  hearingTime: string
  location: string
  hearingType: string
  notes: string
}

function NewHearingDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<HearingForm>({
    defaultValues: { matterId: "", caseNo: "", hearingDate: "", hearingTime: "", location: "", hearingType: "", notes: "" },
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  const { data: matters = [] } = useQuery({
    queryKey: ["matters", "short", "new-hearing"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "m1", title: "260303 — Building Dispute" }]
      const r = await axiosClient.get("/api/matter/get/short-info", { params: { pageNumber: 0, pageSize: 100 } })
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })

  const matterOpts = useMemo(
    () => (matters as Record<string, string>[]).map(m => ({
      value: String(m.id ?? m.matterId),
      label: String(m.title ?? m.matterId ?? m.id),
    })),
    [matters],
  )

  async function onSubmit(data: HearingForm) {
    if (!data.matterId) { toast.error("Select a matter"); return }
    if (!data.hearingDate) { toast.error("Hearing date is required"); return }
    if (env.USE_STATIC_DATA) {
      await new Promise(r => setTimeout(r, 300))
    } else {
      await axiosClient.post("/api/hearing/add", {
        caseNo: data.caseNo,
        hearingDate: data.hearingDate,
        hearingTime: data.hearingTime,
        location: data.location,
        hearingType: data.hearingType,
        notes: data.notes,
        matter: { id: data.matterId },
      })
    }
    toast.success("Hearing scheduled")
    onSuccess?.()
    onClose()
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Schedule Hearing"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Schedule"
      width={440}
    >
      <FormSection title="Hearing Details">
        <ControlledAsyncSelect name="matterId" control={control} label="Matter" options={matterOpts} required />
        <ControlledInput name="caseNo" control={control} label="Case Number" />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <ControlledDatePicker name="hearingDate" control={control} label="Hearing Date" required />
          <ControlledInput name="hearingTime" control={control} label="Time (HH:MM)" />
        </Box>
        <ControlledInput name="hearingType" control={control} label="Hearing Type" />
        <ControlledInput name="location" control={control} label="Court / Location" />
      </FormSection>
      <FormSection title="Notes">
        <ControlledInput name="notes" control={control} label="Notes" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}

export default function UpcomingHearingsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <PageShell
      title="Upcoming Hearings"
      description="Hearings assigned to you"
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Hearing
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "hearingTitle", header: "Hearing", renderCell: (v, row) => String(v || (row as Record<string, unknown>).title || "—") },
          {
            field: "matterTitle",
            header: "Matter",
            renderCell: (v, row) => {
              const m = (row as Record<string, unknown>).matter as Record<string, string> | null
              return String(v || m?.title || "—")
            },
          },
          {
            field: "hearingDate",
            header: "Date",
            renderCell: (v, row) => formatDate(String(v || (row as Record<string, unknown>).date || "")),
          },
          {
            field: "location",
            header: "Location",
            renderCell: (v, row) => {
              const loc = (row as Record<string, unknown>).hearingLocation as Record<string, string> | string | null
              if (typeof loc === "string") return loc
              return String(v || loc?.name || "—")
            },
          },
          { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v || "Scheduled")} /> },
        ]}
        queryKey={["hearings", "upcoming"]}
        queryFn={fetchUpcoming}
        isPaginated={false}
        zebraStriping
      />
      <NewHearingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["hearings", "upcoming"] })
          setGridKey(k => k + 1)
        }}
      />
    </PageShell>
  )
}
