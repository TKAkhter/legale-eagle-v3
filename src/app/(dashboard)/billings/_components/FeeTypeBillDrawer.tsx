import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert, Box, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { billingApi, type FeeBillKind } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"

const SEED: Record<FeeBillKind, (row: Record<string, unknown>) => { name: string; rate: number }> = {
  Contingent: (row) => ({
    name: "Contingent",
    rate: Number(row.remainingAmount ?? (Number(row.contingent ?? 0) - Number(row.billedAmount ?? 0))),
  }),
  NonContingent: (row) => ({
    name: "Non Contingent",
    rate: Number(row.remainingAmount ?? row.nonContingent ?? 0),
  }),
  SuccessRate: (row) => ({
    name: "Success Rate",
    rate: Number(row.remainingAmount ?? (Number(row.finalFixedFees ?? 0) - Number(row.successRateBilledAmount ?? 0))),
  }),
  Enforcement: (row) => ({
    name: "Enforcement",
    rate: Number(row.remainingAmount ?? row.enforcementAmount ?? 0),
  }),
}

interface Props {
  open: boolean
  onClose: () => void
  kind: FeeBillKind
  row: Record<string, unknown> | null
  onSuccess?: () => void
}

export function FeeTypeBillDrawer({ open, onClose, kind, row, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const client = (row?.clients ?? row?.client) as Record<string, unknown> | undefined
  const clientId = String(client?.id ?? "")
  const lfaId = String(row?.id ?? "")
  const needsMatter = kind !== "Enforcement"

  const seed = row ? SEED[kind](row) : { name: kind, rate: 0 }

  const { control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      matterId: String(row?.matterId ?? ""),
      issueDate: today,
      dueDate: due,
      dateOfSupply: today,
      discount: "0",
      tax: "5",
      note: "",
      itemName: seed.name,
      itemRate: String(seed.rate),
    },
  })

  const itemRate = Number(watch("itemRate") || 0)
  const discount = Number(watch("discount") || 0)
  const tax = Number(watch("tax") || 0)
  const afterDisc = itemRate - (itemRate * discount) / 100
  const taxAmt = (afterDisc * tax) / 100
  const finalAmount = afterDisc + taxAmt

  const { data: matters = [] } = useQuery({
    queryKey: ["fee-bill", "matters", clientId, lfaId],
    queryFn: () => billingApi.getMattersByClientLfa(clientId, lfaId),
    enabled: open && needsMatter && !!clientId && !!lfaId,
  })

  const matterOpts = useMemo(
    () => (matters as Record<string, string>[]).map(m => ({ value: m.id, label: m.title ?? m.id })),
    [matters],
  )

  useEffect(() => {
    if (!open || !row) return
    const s = SEED[kind](row)
    reset({
      matterId: String(row.matterId ?? ""),
      issueDate: today,
      dueDate: due,
      dateOfSupply: today,
      discount: "0",
      tax: "5",
      note: "",
      itemName: s.name,
      itemRate: String(s.rate),
    })
  }, [open, row, kind, reset, today, due])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      if (needsMatter && !data.matterId) {
        setSubmitError("Matter is required")
        return
      }
      const rate = Number(data.itemRate)
      const payload: Record<string, unknown> = {
        activityIds: [],
        total: rate,
        discount: Number(data.discount ?? 0),
        discountAmount: (rate * Number(data.discount ?? 0)) / 100,
        discountType: "Percentage",
        discountedAmount: (rate * Number(data.discount ?? 0)) / 100,
        taxableAmount: taxAmt,
        paidAmount: rate,
        finalAmount,
        tax: Number(data.tax ?? 0),
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        dateOfSupply: data.dateOfSupply || null,
        note: data.note,
        invoiceRelatedToId: clientId,
        invoiceType: "CLIENT",
        items: [{ name: String(data.itemName), rate, delete: false }],
        hourlyRates: [],
        expense: false,
        breakDown: [],
        invoiceBillingType: kind,
        includeActivity: false,
        lfaId,
        matterId: data.matterId || row?.matterId,
      }
      if (kind === "Enforcement" && row?.enforcementBillingId) {
        payload.enforcementBillingId = row.enforcementBillingId
      }
      await billingApi.create(payload)
      if (kind === "Enforcement" && row?.enforcementBillingId) {
        await billingApi.completeEnforcementBilling(String(row.enforcementBillingId))
      }
      toast.success(`${kind} invoice generated`)
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

  const clientLabel = client
    ? String(client.companyName ?? (`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "—"))
    : "—"

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={`Generate ${kind} Invoice`}
      subtitle={clientLabel}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Generate Invoice"
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Agreement">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          LFA {String(row?.agreementNo ?? lfaId)}
        </Typography>
        {needsMatter && (
          <ControlledAsyncSelect name="matterId" control={control} label="Matter *" options={matterOpts} required />
        )}
      </FormSection>

      <FormSection title="Dates">
        <Box sx={{ display: "grid", gridTemplateColumns: kind === "Enforcement" ? "1fr 1fr" : "1fr 1fr 1fr", gap: 2 }}>
          <ControlledDatePicker name="issueDate" control={control} label="Issue Date" required />
          <ControlledDatePicker name="dueDate" control={control} label="Due Date" required />
          {kind !== "Enforcement" && <ControlledDatePicker name="dateOfSupply" control={control} label="Date of Supply" />}
        </Box>
      </FormSection>

      <FormSection title="Line Item">
        <ControlledInput name="itemName" control={control} label="Description" />
        <ControlledInput name="itemRate" control={control} label="Amount (AED)" type="number" required />
      </FormSection>

      <FormSection title="Adjustments">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <ControlledInput name="discount" control={control} label="Discount %" type="number" />
          <ControlledInput name="tax" control={control} label="Tax %" type="number" />
        </Box>
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
      </FormSection>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: "right" }}>
        Total {formatCurrency(finalAmount)}
      </Typography>
    </FormDrawer>
  )
}
