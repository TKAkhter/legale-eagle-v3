import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert } from "@mui/material"
import { useQueryClient } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { hearingsApi } from "@/api/hearings"

interface Props {
  open: boolean
  onClose: () => void
  hearingId: string
  matterId?: string
  onSuccess?: () => void
}

/** LMS OpenHearings — reopen a closed hearing. */
export function OpenHearingDrawer({ open, onClose, hearingId, matterId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      openingDate: new Date().toISOString().slice(0, 10),
      decision: "",
    },
  })

  useEffect(() => {
    if (!open) return
    reset({ openingDate: new Date().toISOString().slice(0, 10), decision: "" })
  }, [open, reset])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      await hearingsApi.openHearing(hearingId, {
        openingDate: String(data.openingDate ?? ""),
        decision: String(data.decision ?? ""),
      })
      if (matterId) qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
      qc.invalidateQueries({ queryKey: ["hearings"] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to reopen hearing",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Reopen Hearing"
      subtitle="Set opening date and optional decision note"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Reopen"
      width={420}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Reopen">
        <ControlledDatePicker name="openingDate" control={control} label="Opening Date" required />
        <ControlledInput name="decision" control={control} label="Decision / Note" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
