import { useEffect, useMemo, useState } from "react"
import { Box, Button, Paper, Typography, LinearProgress, Alert } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { FilterActions } from "@components/filters/FilterActions"
import { billingApi } from "@/api/billing"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

type CreditForm = {
  paymentMode: string
  paymentDate: string
  amount: string
  note: string
}

function AddCreditNoteDrawer({
  open,
  clientId,
  onClose,
  onSuccess,
}: {
  open: boolean
  clientId: string
  onClose: () => void
  onSuccess?: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreditForm>({
    defaultValues: { paymentMode: "cash", paymentDate: new Date().toISOString().slice(0, 10), amount: "", note: "" },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  async function onSubmit(data: CreditForm) {
    setSubmitError(null)
    const amount = Number(data.amount)
    if (!clientId) { setSubmitError("Select a client first"); return }
    if (!amount || amount < 1) { setSubmitError("Amount must be at least 1"); return }
    if (!data.paymentMode) { setSubmitError("Payment mode is required"); return }
    if (!data.note?.trim()) { setSubmitError("Note is required"); return }
    try {
      toast.success(await billingApi.addCreditNote({
        clientId,
        paymentMode: data.paymentMode,
        paymentDate: data.paymentDate || null,
        amount,
        note: data.note.trim(),
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to add credit note"
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Credit Note"
      subtitle="Record a credit balance for the selected client"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      width={420}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Details">
        <ControlledSelect
          name="paymentMode"
          control={control}
          label="Payment Mode"
          required
          options={[
            { value: "cash", label: "Cash" },
            { value: "check", label: "Check" },
            { value: "online", label: "Online" },
          ]}
        />
        <ControlledDatePicker name="paymentDate" control={control} label="Payment Date" />
        <ControlledInput name="amount" control={control} label="Amount" type="number" required />
        <ControlledInput name="note" control={control} label="Note" required multiline rows={2} />
      </FormSection>
    </FormDrawer>
  )
}

export default function CreditNotesPage() {
  const qc = useQueryClient()
  const [clientId, setClientId] = useState("")
  const [activeClientId, setActiveClientId] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["billings", "credit-notes", activeClientId],
    queryFn: () => billingApi.getCreditNotes(activeClientId),
    enabled: !!activeClientId,
  })

  const balance = Number((data as { creditNote?: { amount?: number } })?.creditNote?.amount ?? 0)
  const rows = useMemo(() => {
    const list = (data as { creditNoteWithTransactionList?: Record<string, unknown>[] })?.creditNoteWithTransactionList
    return Array.isArray(list) ? list : []
  }, [data])

  return (
    <PageShell
      title="Credit Notes"
      description="Client credit balances and transactions"
      breadcrumbs={[{ label: "Billing", path: "/billings" }, { label: "Credit Notes" }]}
      action={(
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!activeClientId}
          onClick={() => setDrawerOpen(true)}
        >
          Add Credit Note
        </Button>
      )}
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ClientSelectFilter value={clientId} onChange={v => setClientId(v ?? "")} />
          <FilterActions
            onSearch={() => {
              if (!clientId) { toast.info("Select a client first"); return }
              setActiveClientId(clientId)
            }}
            onClear={() => { setClientId(""); setActiveClientId("") }}
          />
        </Box>
      </Paper>

      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      {activeClientId && (
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          Balance: {formatCurrency(balance)}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {!activeClientId ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Select a client and fetch to view credit notes.</Typography>
          </Box>
        ) : rows.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No credit note transactions for this client.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Client", "Amount", "Created At"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map(r => {
                const c = (r.clientMini ?? r.client) as Record<string, string> | undefined
                const name = c?.companyName
                  || [c?.firstName, c?.middleName, c?.lastName].filter(Boolean).join(" ").trim()
                  || "—"
                return (
                  <Box component="tr" key={String(r.id)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{name}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 600 }}>{formatCurrency(Number(r.amount ?? 0))}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{formatDate(String(r.createdAt ?? ""))}</Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Paper>

      <AddCreditNoteDrawer
        open={drawerOpen}
        clientId={activeClientId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["billings", "credit-notes", activeClientId] })
          refetch()
        }}
      />
    </PageShell>
  )
}
