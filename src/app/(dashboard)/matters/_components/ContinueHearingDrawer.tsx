import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { hearingsApi } from "@/api/hearings"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { saveHearingToOutlook } from "@/lib/outlook/calendar"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  hearing: Record<string, unknown> | null
  onSuccess?: () => void
}

type FormValues = {
  hearingDate: string
  hearingTime: string
  nextHearingDate: string
  caseNo: string
  caseYear: string
  caseTypeId: string
  chamberNo: string
  hearingLocation: string
  typeId: string
  description: string
  summary: string
  note: string
  attorney: string
  attendedAttorney: string
}

const YEAR_OPTS = Array.from({ length: 12 }, (_, i) => {
  const y = String(new Date().getFullYear() - 5 + i)
  return { value: y, label: y }
})

export function ContinueHearingDrawer({ open, onClose, matterId, hearing, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [outlookPrompt, setOutlookPrompt] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<{ form: FormData; values: FormValues } | null>(null)
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      hearingDate: "",
      hearingTime: "",
      nextHearingDate: "",
      caseNo: "",
      caseYear: "",
      caseTypeId: "",
      chamberNo: "",
      hearingLocation: "",
      typeId: "",
      description: "",
      summary: "",
      note: "",
      attorney: "",
      attendedAttorney: "",
    },
  })

  const companyQ = useQuery({
    queryKey: ["company", "info", "oneDrive"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
    enabled: open,
    staleTime: 5 * 60_000,
  })
  const oneDriveEnabled = Boolean(companyQ.data?.oneDrive)

  const usersQ = useQuery({
    queryKey: ["admin", "users", "mini", "continue-hearing"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })
  const locationsQ = useQuery({
    queryKey: ["lookups", "locations"],
    queryFn: () => adminApi.getLocations(),
    enabled: open,
  })
  const hearingTypesQ = useQuery({
    queryKey: ["lookups", "hearingTypes"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "ht1", name: "CMC" }, { id: "ht2", name: "Trial" }]
      const r = await axiosClient.get("/api/hearing/list/type")
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })
  const caseTypesQ = useQuery({
    queryKey: ["lookups", "caseTypes"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "ct1", name: "Civil" }, { id: "ct2", name: "Commercial" }]
      const r = await axiosClient.get("/api/util/list/case/type")
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })

  const userOpts = useMemo(() => ((usersQ.data ?? []) as Record<string, string>[]).map(u => ({
    value: String(u.id),
    label: u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id),
  })), [usersQ.data])
  const locationOpts = useMemo(() => ((locationsQ.data ?? []) as Record<string, string>[]).map(l => ({
    value: String(l.id ?? l.name),
    label: String(l.name ?? l.id),
  })), [locationsQ.data])
  const hearingTypeOpts = useMemo(() => ((hearingTypesQ.data ?? []) as Record<string, string>[]).map(t => ({
    value: String(t.id), label: String(t.name ?? t.id),
  })), [hearingTypesQ.data])
  const caseTypeOpts = useMemo(() => ((caseTypesQ.data ?? []) as Record<string, string>[]).map(t => ({
    value: String(t.id), label: String(t.name ?? t.id),
  })), [caseTypesQ.data])

  useEffect(() => {
    if (!open || !hearing) return
    const attorney = hearing.attorney as { id?: string } | string | undefined
    const attended = hearing.attendedAttorney as { id?: string } | string | undefined
    const loc = hearing.location ?? hearing.hearingLocation
    const locId = typeof loc === "object" && loc
      ? String((loc as { id?: string }).id ?? (loc as { name?: string }).name ?? "")
      : String(loc ?? "")
    reset({
      hearingDate: String(hearing.nextHearingDate ?? hearing.hearingDate ?? "").slice(0, 10),
      hearingTime: String(hearing.hearingTime ?? ""),
      nextHearingDate: "",
      caseNo: String(hearing.caseNo ?? ""),
      caseYear: String(hearing.caseYear ?? ""),
      caseTypeId: String(hearing.caseTypeId ?? ""),
      chamberNo: String(hearing.chamberNo ?? ""),
      hearingLocation: locId,
      typeId: String(hearing.typeId ?? ""),
      description: "",
      summary: "",
      note: "",
      attorney: typeof attorney === "object" ? String(attorney?.id ?? "") : String(attorney ?? hearing.attorneyId ?? ""),
      attendedAttorney: typeof attended === "object" ? String(attended?.id ?? "") : String(attended ?? hearing.attendedAttorneyId ?? ""),
    })
    setFiles(null)
    setSubmitError(null)
    setOutlookPrompt(false)
    setPendingPayload(null)
  }, [open, hearing, reset])

  function buildFormData(data: FormValues): FormData {
    const form = new FormData()
    form.append("matterId", matterId)
    form.append("parentId", String(hearing?.hearingId ?? hearing?.id ?? hearing?.parentId ?? ""))
    form.append("hearingDate", String(data.hearingDate ?? ""))
    form.append("hearingTime", String(data.hearingTime ?? ""))
    form.append("nextHearingDate", String(data.nextHearingDate ?? ""))
    form.append("caseNo", String(data.caseNo ?? ""))
    form.append("caseYear", String(data.caseYear ?? ""))
    form.append("caseTypeId", String(data.caseTypeId ?? ""))
    form.append("chamberNo", String(data.chamberNo ?? ""))
    form.append("hearingLocation", String(data.hearingLocation ?? ""))
    form.append("description", String(data.description ?? ""))
    form.append("summary", String(data.summary ?? ""))
    form.append("note", String(data.note ?? ""))
    form.append("attorney", String(data.attorney ?? ""))
    form.append("attendedAttorney", String(data.attendedAttorney ?? ""))
    form.append("typeId", String(data.typeId || hearing?.typeId || ""))
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) form.append("files", files.item(i)!)
    } else {
      form.append("files", "")
    }
    return form
  }

  async function persistHearing(form: FormData, values: FormValues, saveToOutlook: boolean) {
    setSaving(true)
    setSubmitError(null)
    try {
      const created = await hearingsApi.continueHearing(form) as Record<string, unknown>

      if (saveToOutlook && oneDriveEnabled && !env.USE_STATIC_DATA) {
        try {
          const client = (created.client ?? (created.matter as { client?: Record<string, unknown> } | undefined)?.client) as Record<string, unknown> | undefined
          const clientName = client?.clientType === "COMPANY"
            ? String(client?.companyName ?? "")
            : String(client?.clientName ?? client?.name ?? client?.firstName ?? "")
          const attorneys = ((usersQ.data ?? []) as Record<string, unknown>[]).map(u => ({
            id: String(u.id ?? ""),
            firstName: String(u.firstName ?? ""),
            lastName: String(u.lastName ?? ""),
            email: String(u.email ?? ""),
          }))
          const locations = ((locationsQ.data ?? []) as Record<string, unknown>[]).map(l => ({
            id: String(l.id ?? ""),
            name: String(l.name ?? ""),
          }))
          await saveHearingToOutlook(
            {
              ...created,
              ...values,
              id: String(created.hearingId ?? created.id ?? ""),
              hearingId: String(created.hearingId ?? created.id ?? ""),
              clientName,
              matterName: String((created.matter as { title?: string } | undefined)?.title ?? hearing?.matterTitle ?? ""),
              hearingDate: values.hearingDate,
              hearingTime: values.hearingTime,
            },
            attorneys,
            locations,
          )
        } catch {
          toast.warning("Hearing saved but Outlook event failed")
        }
      }

      qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
      qc.invalidateQueries({ queryKey: ["hearings"] })
      qc.invalidateQueries({ queryKey: ["calendar"] })
      toast.success("Hearing continued successfully")
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to continue hearing",
      )
    } finally {
      setSaving(false)
      setOutlookPrompt(false)
      setPendingPayload(null)
    }
  }

  async function onSubmit(data: FormValues) {
    if (!data.hearingDate) { setSubmitError("Hearing date is required"); return }
    if (!data.attorney) { setSubmitError("Responsible attorney is required"); return }
    const form = buildFormData(data)
    if (oneDriveEnabled) {
      setPendingPayload({ form, values: data })
      setOutlookPrompt(true)
      return
    }
    await persistHearing(form, data, false)
  }

  return (
    <>
      <FormDrawer
        open={open}
        onClose={onClose}
        title="Continue Hearing"
        subtitle="Schedule the next hearing in this chain"
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting || saving}
        submitLabel="Continue"
        width={560}
      >
        {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
        <FormSection title="Case">
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <ControlledAsyncSelect name="caseTypeId" control={control} label="Case Type" options={caseTypeOpts} />
            <ControlledInput name="caseNo" control={control} label="Case No" />
            <ControlledSelect name="caseYear" control={control} label="Case Year" options={YEAR_OPTS} />
            <ControlledInput name="chamberNo" control={control} label="Chamber No" />
          </Box>
        </FormSection>
        <FormSection title="Hearing">
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <ControlledDatePicker name="hearingDate" control={control} label="Hearing Date" required />
            <ControlledInput name="hearingTime" control={control} label="Time (HH:MM)" required />
            <ControlledDatePicker name="nextHearingDate" control={control} label="Next Hearing Date" />
            <ControlledAsyncSelect name="typeId" control={control} label="Hearing Type" options={hearingTypeOpts} />
            <ControlledAsyncSelect name="hearingLocation" control={control} label="Location" options={locationOpts} />
          </Box>
        </FormSection>
        <FormSection title="Attorneys">
          <ControlledAsyncSelect name="attorney" control={control} label="Responsible Attorney *" options={userOpts} required />
          <ControlledAsyncSelect name="attendedAttorney" control={control} label="Attended Attorney" options={userOpts} />
        </FormSection>
        <FormSection title="Notes & Files">
          <ControlledInput name="description" control={control} label="Description" multiline rows={2} />
          <ControlledInput name="summary" control={control} label="Summary" multiline rows={2} />
          <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Attachments (optional)
            </Typography>
            <Button component="label" variant="outlined" size="small">
              {files?.length ? `${files.length} file(s) selected` : "Choose files"}
              <input
                hidden
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                onChange={e => setFiles(e.target.files)}
              />
            </Button>
          </Box>
        </FormSection>
      </FormDrawer>

      <Dialog
        open={outlookPrompt}
        onClose={() => !saving && setOutlookPrompt(false)}
      >
        <DialogTitle>Save to Outlook Calendar</DialogTitle>
        <DialogContent>
          Do you want to save this hearing in Outlook Calendar?
        </DialogContent>
        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => {
              if (!pendingPayload) return
              void persistHearing(pendingPayload.form, pendingPayload.values, false)
            }}
          >
            No
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => {
              if (!pendingPayload) return
              void persistHearing(pendingPayload.form, pendingPayload.values, true)
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
