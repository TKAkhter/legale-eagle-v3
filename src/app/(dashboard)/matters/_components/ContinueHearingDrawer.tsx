import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert, Box } from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { hearingsApi } from "@/api/hearings"

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  hearing: Record<string, unknown> | null
  onSuccess?: () => void
}

export function ContinueHearingDrawer({ open, onClose, matterId, hearing, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      hearingDate: "",
      hearingTime: "",
      nextHearingDate: "",
      caseNo: "",
      chamberNo: "",
      hearingLocation: "",
      description: "",
      summary: "",
      note: "",
      attorney: "",
      attendedAttorney: "",
    },
  })

  useEffect(() => {
    if (!open || !hearing) return
    const attorney = hearing.attorney as { id?: string } | string | undefined
    const attended = hearing.attendedAttorney as { id?: string } | string | undefined
    reset({
      hearingDate: String(hearing.nextHearingDate ?? hearing.hearingDate ?? "").slice(0, 10),
      hearingTime: String(hearing.hearingTime ?? ""),
      nextHearingDate: "",
      caseNo: String(hearing.caseNo ?? ""),
      chamberNo: String(hearing.chamberNo ?? ""),
      hearingLocation: String(
        typeof hearing.location === "string"
          ? hearing.location
          : (hearing.location as { name?: string })?.name
            ?? hearing.hearingLocation
            ?? "",
      ),
      description: "",
      summary: "",
      note: "",
      attorney: typeof attorney === "object" ? String(attorney?.id ?? "") : String(attorney ?? ""),
      attendedAttorney: typeof attended === "object" ? String(attended?.id ?? "") : String(attended ?? ""),
    })
  }, [open, hearing, reset])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      const form = new FormData()
      form.append("matterId", matterId)
      form.append("parentId", String(hearing?.id ?? hearing?.parentId ?? ""))
      form.append("hearingDate", String(data.hearingDate ?? ""))
      form.append("hearingTime", String(data.hearingTime ?? ""))
      form.append("nextHearingDate", String(data.nextHearingDate ?? ""))
      form.append("caseNo", String(data.caseNo ?? ""))
      form.append("chamberNo", String(data.chamberNo ?? ""))
      form.append("hearingLocation", String(data.hearingLocation ?? ""))
      form.append("description", String(data.description ?? ""))
      form.append("summary", String(data.summary ?? ""))
      form.append("note", String(data.note ?? ""))
      form.append("attorney", String(data.attorney ?? ""))
      form.append("attendedAttorney", String(data.attendedAttorney ?? ""))
      if (hearing?.typeId) form.append("typeId", String(hearing.typeId))
      if (hearing?.caseTypeId) form.append("caseTypeId", String(hearing.caseTypeId))
      if (hearing?.caseYear) form.append("caseYear", String(hearing.caseYear))
      await hearingsApi.continueHearing(form)
      qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to continue hearing",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Continue Hearing"
      subtitle="Schedule the next hearing in this chain"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Continue"
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Hearing">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <ControlledDatePicker name="hearingDate" control={control} label="Hearing Date" required />
          <ControlledInput name="hearingTime" control={control} label="Time (HH:MM)" />
          <ControlledDatePicker name="nextHearingDate" control={control} label="Next Hearing Date" />
          <ControlledInput name="caseNo" control={control} label="Case No" />
          <ControlledInput name="chamberNo" control={control} label="Chamber No" />
          <ControlledInput name="hearingLocation" control={control} label="Location" />
        </Box>
      </FormSection>
      <FormSection title="Attorneys">
        <ControlledInput name="attorney" control={control} label="Responsible Attorney ID" />
        <ControlledInput name="attendedAttorney" control={control} label="Attended Attorney ID" />
      </FormSection>
      <FormSection title="Notes">
        <ControlledInput name="description" control={control} label="Description" multiline rows={2} />
        <ControlledInput name="summary" control={control} label="Summary" multiline rows={2} />
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
      </FormSection>
    </FormDrawer>
  )
}
