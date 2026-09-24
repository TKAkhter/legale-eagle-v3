import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { adminApi } from "@/api/admin"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"

export type RateCardFormValues = {
  userId: string
  ratePerHour: string
  effectiveDate: string
  note: string
}

interface Props {
  open: boolean
  onClose: () => void
  mode: "add" | "edit"
  initial?: Partial<RateCardFormValues> & { id?: string; userName?: string }
  onSuccess?: () => void
}

export function UserRateCardDrawer({ open, onClose, mode, initial, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<RateCardFormValues>({
    defaultValues: {
      userId: "",
      ratePerHour: "",
      effectiveDate: today,
      note: "",
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min", "rate-cards"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })

  const userOpts = useMemo(() => {
    const list = (Array.isArray(users) ? users : []) as Record<string, string>[]
    return list.map(u => ({
      value: u.id,
      label: u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id,
    }))
  }, [users])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset({
      userId: initial?.userId ?? "",
      ratePerHour: initial?.ratePerHour != null ? String(initial.ratePerHour) : "",
      effectiveDate: initial?.effectiveDate ? String(initial.effectiveDate).slice(0, 10) : today,
      note: initial?.note ?? "",
    })
  }, [open, initial, reset, today])

  async function onSubmit(data: RateCardFormValues) {
    setSubmitError(null)
    if (!data.userId) {
      setSubmitError("Select a user")
      return
    }
    if (!data.ratePerHour || Number.isNaN(Number(data.ratePerHour))) {
      setSubmitError("Rate is required")
      return
    }
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 300))
      } else {
        const payload: Record<string, unknown> = {
          userId: data.userId,
          ratePerHour: Number(data.ratePerHour),
          effectiveDate: data.effectiveDate,
          note: data.note || "",
        }
        if (mode === "edit" && initial?.id) payload.id = initial.id
        await axiosClient.post("/api/user/rate-cards/createorupdate", payload)
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save rate card",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Rate Card" : "Add Rate Card"}
      subtitle="Attorney hourly rate effective from a date"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={mode === "edit" ? "Update" : "Add"}
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Rate">
        <ControlledAsyncSelect
          name="userId"
          control={control}
          label="Attorney *"
          options={userOpts}
          required
        />
        <ControlledInput name="ratePerHour" control={control} label="Rate / Hour" type="number" required />
        <ControlledDatePicker name="effectiveDate" control={control} label="Effective Date" required />
        <ControlledInput name="note" control={control} label="Note" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
