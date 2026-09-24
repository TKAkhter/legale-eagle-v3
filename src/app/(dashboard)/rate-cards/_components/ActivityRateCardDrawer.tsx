import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Alert } from "@mui/material"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { activityRateCardsApi } from "@/api/activityRateCards"

type FormValues = {
  title: string
  activityType: "Time" | "Expense"
  billingType: string
  rate: string
}

interface Props {
  open: boolean
  onClose: () => void
  defaultActivityType?: "Time" | "Expense"
  onSuccess?: () => void
}

const BILLING_OPTS = [
  { value: "Hourly", label: "Hourly" },
  { value: "Fixed", label: "Fixed" },
  { value: "Session", label: "Session" },
]

export function ActivityRateCardDrawer({ open, onClose, defaultActivityType = "Time", onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: "",
      activityType: defaultActivityType,
      billingType: "",
      rate: "",
    },
  })
  const activityType = useWatch({ control, name: "activityType" })

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset({
      title: "",
      activityType: defaultActivityType || "Time",
      billingType: "",
      rate: "",
    })
  }, [open, defaultActivityType, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    if (!data.title.trim()) {
      setSubmitError("Title is required")
      return
    }
    if (data.activityType === "Time" && !data.billingType) {
      setSubmitError("Billing type is required for Time entries")
      return
    }
    const rate = Number(data.rate)
    if (!data.rate || Number.isNaN(rate)) {
      setSubmitError("Valid rate amount is required")
      return
    }
    try {
      await activityRateCardsApi.create({
        title: data.title.trim(),
        activityType: data.activityType,
        billingType: data.activityType === "Expense" ? "Expense" : data.billingType,
        rate,
      })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to add rate card",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Rate Card"
      subtitle="Activity rate template for time or expense logging"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Add"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Template">
        <ControlledInput name="title" control={control} label="Title" required />
        <ControlledSelect
          name="activityType"
          control={control}
          label="Time Log Entry Type"
          options={[
            { value: "Time", label: "Time" },
            { value: "Expense", label: "Expense" },
          ]}
          required
        />
        {activityType === "Time" && (
          <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} required />
        )}
        <ControlledInput name="rate" control={control} label="Amount" type="number" required />
      </FormSection>
    </FormDrawer>
  )
}
