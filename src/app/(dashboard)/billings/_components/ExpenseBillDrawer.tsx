import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { Alert, Box, Typography, IconButton } from "@mui/material"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import AddIcon from "@mui/icons-material/Add"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  activities: Record<string, unknown>[]
  client?: Record<string, unknown> | null
  matter?: Record<string, unknown> | null
  onSuccess?: () => void
}

type ItemRow = { name: string; rate: number; delete: boolean; disbursementType: string }

export function ExpenseBillDrawer({ open, onClose, activities, client, matter, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { control, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      issueDate: today,
      dueDate: due,
      dateOfSupply: today,
      discount: "0",
      discountType: "Percentage",
      discountAmount: "0",
      tax: "0",
      note: "",
      items: [] as ItemRow[],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const items = watch("items")
  const discount = Number(watch("discount") || 0)
  const discountType = watch("discountType")
  const tax = Number(watch("tax") || 0)

  const total = useMemo(
    () => (items ?? []).filter(i => !i.delete).reduce((s, i) => s + Number(i.rate || 0), 0),
    [items],
  )
  const discAmt = discountType === "Amount" ? Number(watch("discountAmount") || 0) : (total * discount) / 100
  const afterDisc = Math.max(0, total - discAmt)
  const taxAmt = (afterDisc * tax) / 100
  const finalAmount = afterDisc + taxAmt

  useEffect(() => {
    if (!open) return
    const seeded: ItemRow[] = activities.map(a => ({
      name: String(a.note ?? a.activity ?? "Expense"),
      rate: Number(a.rate ?? a.billing ?? 0),
      delete: false,
      disbursementType: String(a.disbursementType ?? "OTHER_EXPENSES") || "OTHER_EXPENSES",
    }))
    reset({
      issueDate: today,
      dueDate: due,
      dateOfSupply: today,
      discount: "0",
      discountType: "Percentage",
      discountAmount: "0",
      tax: "0",
      note: "",
      items: seeded.length ? seeded : [{ name: "", rate: 0, delete: false, disbursementType: "OTHER_EXPENSES" }],
    })
    // Pre-calc hourly rates when activities present
    void billingApi.calculateHoursMini(
      activities.map(a => ({
        hours: a.hours ?? 0,
        minutes: a.minutes ?? 0,
        responsiblePerson: a.responsiblePerson,
        rate: a.rate,
        lfaId: a.lfaId,
        billingType: a.billingType,
      })),
    ).then(calc => {
      if (calc && typeof calc === "object" && "hourlyRates" in (calc as object)) {
        setValue("items", seeded)
      }
    }).catch(() => {/* ignore calc errors; items already seeded */})
  }, [open, activities, reset, setValue, today, due])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      const relatedId = matter?.id ? String(matter.id) : String(client?.id ?? "")
      const payload = {
        activityIds: activities.map(a => String(a.activityId ?? a.id)),
        total,
        discount: Number(data.discount ?? 0),
        discountAmount: discAmt,
        discountType: data.discountType,
        discountedAmount: discAmt,
        taxableAmount: taxAmt,
        paidAmount: total,
        finalAmount,
        tax,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        dateOfSupply: data.dateOfSupply || null,
        note: data.note,
        invoiceRelatedToId: relatedId,
        invoiceType: matter?.id ? "MATTER" : "CLIENT",
        items: (data.items as ItemRow[]).map(item => ({
          name: item.name,
          rate: Number(item.rate),
          delete: !!item.delete,
          disbursementType: (item.disbursementType || "").trim() || "OTHER_EXPENSES",
        })),
        hourlyRates: [],
        expense: true,
        breakDown: [],
        invoiceBillingType: "Expense",
        includeActivity: false,
      }
      await billingApi.create(payload)
      toast.success("Expense invoice generated")
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to generate invoice",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Generate Expense Invoice"
      subtitle={matter ? String(matter.title ?? "") : String((client as { companyName?: string })?.companyName ?? "")}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Generate Invoice"
      width={640}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Dates">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          <ControlledDatePicker name="issueDate" control={control} label="Issue Date" required />
          <ControlledDatePicker name="dueDate" control={control} label="Due Date" required />
          <ControlledDatePicker name="dateOfSupply" control={control} label="Date of Supply" />
        </Box>
      </FormSection>

      <FormSection title="Line Items" description="Disbursements passed to client">
        {fields.map((field, idx) => (
          <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "1fr 120px 140px 40px", gap: 1, mb: 1, alignItems: "center" }}>
            <ControlledInput name={`items.${idx}.name`} control={control} label="Description" />
            <ControlledInput name={`items.${idx}.rate`} control={control} label="Amount" type="number" />
            <ControlledInput name={`items.${idx}.disbursementType`} control={control} label="Type" />
            <IconButton size="small" onClick={() => remove(idx)} aria-label="Remove item"><DeleteOutlinedIcon fontSize="small" /></IconButton>
          </Box>
        ))}
        <Box
          component="button"
          type="button"
          onClick={() => append({ name: "", rate: 0, delete: false, disbursementType: "OTHER_EXPENSES" })}
          sx={{
            display: "inline-flex", alignItems: "center", gap: 0.5, border: "none", background: "none",
            color: "primary.main", cursor: "pointer", fontSize: 13, fontWeight: 600, p: 0, mt: 0.5,
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} /> Add line
        </Box>
      </FormSection>

      <FormSection title="Adjustments">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          <ControlledSelect
            name="discountType"
            control={control}
            label="Discount Type"
            options={[{ value: "Percentage", label: "Percentage" }, { value: "Amount", label: "Amount" }]}
          />
          {discountType === "Amount"
            ? <ControlledInput name="discountAmount" control={control} label="Discount Amount" type="number" />
            : <ControlledInput name="discount" control={control} label="Discount %" type="number" />}
          <ControlledInput name="tax" control={control} label="Tax %" type="number" />
        </Box>
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
      </FormSection>

      <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
        <Typography variant="body2" color="text.secondary">Subtotal {formatCurrency(total)}</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total {formatCurrency(finalAmount)}</Typography>
      </Box>
    </FormDrawer>
  )
}
