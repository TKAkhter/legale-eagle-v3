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
  matterId: string
  hearingId: string
  onSuccess?: () => void
}

export function CloseHearingDrawer({ open, onClose, matterId, hearingId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      closingDate: new Date().toISOString().slice(0, 10),
      decision: "",
    },
  })

  useEffect(() => {
    if (!open) return
    reset({ closingDate: new Date().toISOString().slice(0, 10), decision: "" })
  }, [open, reset])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      await hearingsApi.closeHearing(hearingId, {
        closingDate: String(data.closingDate ?? ""),
        decision: String(data.decision ?? ""),
      })
      qc.invalidateQueries({ queryKey: ["matters", "hearings", matterId] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to close hearing",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Close Hearing"
      subtitle="Record closing date and decision"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Close Hearing"
      width={420}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Closure">
        <ControlledDatePicker name="closingDate" control={control} label="Closing Date" required />
        <ControlledInput name="decision" control={control} label="Decision" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
