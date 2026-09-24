import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert } from "@mui/material"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { budgetingApi } from "@/api/budgeting"

export type BudgetCardFormValues = {
  amount: string
  year: string
  month: string
}

interface Props {
  open: boolean
  onClose: () => void
  mode: "add" | "edit"
  userId: string
  initial?: Partial<BudgetCardFormValues> & { id?: string }
  onSuccess?: () => void
}

const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
}))

function yearOpts(): { value: string; label: string }[] {
  const current = new Date().getFullYear()
  const end = 2030
  return Array.from({ length: Math.max(1, end - current + 1) }, (_, i) => {
    const y = String(current + i)
    return { value: y, label: y }
  })
}

export function BudgetCardDrawer({ open, onClose, mode, userId, initial, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const years = useMemo(() => yearOpts(), [])
  const defaults = useMemo(() => {
    const n = new Date()
    return { year: String(n.getFullYear()), month: String(n.getMonth() + 1) }
  }, [])
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<BudgetCardFormValues>({
    defaultValues: {
      amount: "",
      year: defaults.year,
      month: defaults.month,
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset({
      amount: initial?.amount != null ? String(initial.amount) : "",
      year: initial?.year != null ? String(initial.year) : defaults.year,
      month: initial?.month != null ? String(initial.month) : defaults.month,
    })
  }, [open, initial, reset, defaults])

  async function onSubmit(data: BudgetCardFormValues) {
    setSubmitError(null)
    if (!userId) {
      setSubmitError("Select a user first")
      return
    }
    const amount = Number(data.amount)
    if (!data.amount || Number.isNaN(amount) || amount < 0) {
      setSubmitError("Budget amount is required")
      return
    }
    try {
      const payload = {
        userId,
        amount,
        month: Number(data.month),
        year: Number(data.year),
      }
      if (mode === "edit" && initial?.id) {
        await budgetingApi.updateBudget(initial.id, payload)
      } else {
        await budgetingApi.createBudget(payload)
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save budget",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Budget" : "Add Budget"}
      subtitle="Monthly budget amount for the selected fee earner"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={mode === "edit" ? "Update" : "Add"}
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Budget">
        <ControlledInput name="amount" control={control} label="Budget Amount" type="number" required />
        <ControlledSelect name="year" control={control} label="Year" options={years} required />
        <ControlledSelect name="month" control={control} label="Month" options={MONTH_OPTS} required />
      </FormSection>
    </FormDrawer>
  )
}
