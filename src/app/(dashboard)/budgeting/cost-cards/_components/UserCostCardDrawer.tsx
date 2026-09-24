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
import { budgetingApi } from "@/api/budgeting"

export type CostCardFormValues = {
  userId: string
  costPerHour: string
  effectiveDate: string
  note: string
}

interface Props {
  open: boolean
  onClose: () => void
  mode: "add" | "edit"
  /** When true, user picker lists inactive/login-disabled users (Inactive tab). */
  inactiveTab?: boolean
  initial?: Partial<CostCardFormValues> & { id?: string }
  onSuccess?: () => void
}

export function UserCostCardDrawer({ open, onClose, mode, inactiveTab, initial, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<CostCardFormValues>({
    defaultValues: {
      userId: "",
      costPerHour: "",
      effectiveDate: today,
      note: "",
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min", "cost-cards"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })

  const userOpts = useMemo(() => {
    const list = (Array.isArray(users) ? users : []) as Record<string, unknown>[]
    const filtered = list.filter(u => {
      const active = u.isActive !== false && u.active !== false
      const loginDisabled = Boolean(u.loginDisabled)
      if (mode === "edit") return true
      if (inactiveTab) return !active || loginDisabled
      return active && !loginDisabled
    })
    return filtered.map(u => ({
      value: String(u.id),
      label:
        String(u.fullName ?? "")
        || `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim()
        || String(u.email ?? u.id),
    }))
  }, [users, inactiveTab, mode])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    reset({
      userId: initial?.userId ?? "",
      costPerHour: initial?.costPerHour != null ? String(initial.costPerHour) : "",
      effectiveDate: initial?.effectiveDate ? String(initial.effectiveDate).slice(0, 10) : today,
      note: initial?.note ?? "",
    })
  }, [open, initial, reset, today])

  async function onSubmit(data: CostCardFormValues) {
    setSubmitError(null)
    if (!data.userId) {
      setSubmitError("Select a user")
      return
    }
    if (!data.costPerHour || Number.isNaN(Number(data.costPerHour)) || Number(data.costPerHour) < 0) {
      setSubmitError("Cost per hour is required")
      return
    }
    if (!data.effectiveDate) {
      setSubmitError("Effective date is required")
      return
    }
    try {
      await budgetingApi.saveCostCard({
        userId: data.userId,
        costPerHour: Number(data.costPerHour),
        effectiveDate: data.effectiveDate,
        note: data.note || "",
        id: mode === "edit" && initial?.id ? initial.id : undefined,
      })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save cost card",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Cost Card" : "Add Cost Card"}
      subtitle="Attorney cost rate effective from a date"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={mode === "edit" ? "Update" : "Add"}
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Cost">
        <ControlledAsyncSelect
          name="userId"
          control={control}
          label="Fee Earner *"
          options={userOpts}
          required
        />
        <ControlledInput name="costPerHour" control={control} label="Cost / Hour" type="number" required />
        <ControlledDatePicker name="effectiveDate" control={control} label="Effective Date" required />
        <ControlledInput name="note" control={control} label="Note" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
