import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledCheckbox } from "@components/forms/ControlledCheckbox"
import { lfaApi } from "@/api/lfa"
import { toast } from "@/lib/toast"

const BILLING_OPTS = ["Hourly", "Fixed", "Session", "Contingent", "NonContingent", "SuccessRate", "Enforcement"]
  .map(v => ({ value: v, label: v }))

function unwrapLfa(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {}
  const obj = raw as Record<string, unknown>
  if (obj.lfa && typeof obj.lfa === "object") return obj.lfa as Record<string, unknown>
  return obj
}

interface Props { mode: "full" | "partial" }

export function LfaAmendPage({ mode }: Props) {
  const { lfaId = "" } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ["lfa", "amend", lfaId],
    queryFn: () => lfaApi.getById(lfaId),
    enabled: !!lfaId,
  })

  const lfa = unwrapLfa(raw)

  const { control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      agreementNo: "",
      lfaTitle: "",
      billingType: "Hourly",
      agreementDate: "",
      applicableDate: "",
      endDate: "",
      isEndDate: false,
      fixedBillingAmount: "",
      contingent: "0",
      nonContingent: "0",
      successRate: "0",
      successRateType: "Amount",
      cap: false,
      capAmount: "",
      capThresholdType: "Percentage",
      threshold: "",
      retainer: false,
      retainerAmount: "",
      retainerValidity: "MONTH",
      retainerValidityDuration: "1",
      referral: false,
      referralPercentage: "",
      enforcement: false,
      enforcementAmount: "",
      scope: "",
      hourlyAmendmentType: "Complete",
      sessionAmendmentType: "Complete",
      amendmentRate: "",
    },
  })

  const billingType = watch("billingType")
  const hasCap = watch("cap")
  const hasRetainer = watch("retainer")
  const hasReferral = watch("referral")
  const hasEnforcement = watch("enforcement")

  useEffect(() => {
    if (!lfa?.id) return
    const toDate = (v: unknown) => (v ? String(v).slice(0, 10) : "")
    reset({
      agreementNo: String(lfa.agreementNo ?? ""),
      lfaTitle: String(lfa.lfaTitle ?? ""),
      billingType: String(lfa.billingType ?? "Hourly"),
      agreementDate: toDate(lfa.agreementDate),
      applicableDate: toDate(lfa.applicableDate ?? lfa.agreementDate),
      endDate: toDate(lfa.endDate),
      isEndDate: !!lfa.isEndDate || !!lfa.endDate,
      fixedBillingAmount: lfa.fixedBillingAmount != null ? String(lfa.fixedBillingAmount) : String(lfa.fixedFee ?? ""),
      contingent: String(lfa.contingent ?? 0),
      nonContingent: String(lfa.nonContingent ?? 0),
      successRate: String(lfa.successRate ?? 0),
      successRateType: String(lfa.successRateType ?? "Amount"),
      cap: !!lfa.cap,
      capAmount: lfa.capAmount != null ? String(lfa.capAmount) : "",
      capThresholdType: String(lfa.capThresholdType ?? "Percentage"),
      threshold: lfa.threshold != null ? String(lfa.threshold) : "",
      retainer: !!lfa.retainer,
      retainerAmount: lfa.retainerAmount != null ? String(lfa.retainerAmount) : "",
      retainerValidity: String(lfa.retainerValidity ?? "MONTH"),
      retainerValidityDuration: String(lfa.retainerValidityDuration ?? 1),
      referral: !!lfa.referral,
      referralPercentage: lfa.referralPercentage != null ? String(lfa.referralPercentage) : "",
      enforcement: !!lfa.enforcement,
      enforcementAmount: lfa.enforcementAmount != null ? String(lfa.enforcementAmount) : "",
      scope: String(lfa.scope ?? ""),
      hourlyAmendmentType: "Complete",
      sessionAmendmentType: "Complete",
      amendmentRate: "",
    })
  }, [lfa, reset])

  async function onSubmit(data: Record<string, unknown>) {
    setSubmitError(null)
    try {
      const capAmount = data.cap ? Number(data.capAmount ?? 0) : 0
      const threshold = Number(data.threshold ?? 0)
      const capThresholdAmount = data.capThresholdType === "Percentage"
        ? ((capAmount * threshold) / 100).toFixed(2)
        : threshold

      let retainerEndDate = ""
      if (data.retainer) {
        const base = new Date(String(data.agreementDate || Date.now()))
        const dur = Number(data.retainerValidityDuration ?? 1)
        if (data.retainerValidity === "YEAR") base.setFullYear(base.getFullYear() + dur)
        else base.setMonth(base.getMonth() + dur)
        retainerEndDate = base.toISOString().slice(0, 10)
      }

      const payload: Record<string, unknown> = {
        ...lfa,
        id: lfa.id,
        agreementNo: data.agreementNo,
        lfaTitle: typeof data.lfaTitle === "object" && data.lfaTitle && "id" in (data.lfaTitle as object)
          ? (data.lfaTitle as { id: string }).id
          : data.lfaTitle,
        billingType: data.billingType,
        agreementDate: data.agreementDate,
        applicableDate: data.applicableDate,
        endDate: data.isEndDate ? data.endDate : "",
        isEndDate: data.isEndDate,
        fixedBillingAmount: data.fixedBillingAmount ? Number(data.fixedBillingAmount) : undefined,
        contingent: Number(data.contingent ?? 0),
        nonContingent: Number(data.nonContingent ?? 0),
        successRate: Number(data.successRate ?? 0),
        successRateType: data.successRateType,
        cap: !!data.cap,
        capAmount,
        capThresholdType: data.capThresholdType,
        threshold,
        capThresholdAmount,
        retainer: !!data.retainer,
        retainerAmount: data.retainer ? Number(data.retainerAmount ?? 0) : 0,
        retainerValidity: data.retainerValidity,
        retainerValidityDuration: Number(data.retainerValidityDuration ?? 1),
        retainerEndDate,
        referral: !!data.referral,
        referralPercentage: data.referral ? Number(data.referralPercentage ?? 0) : 0,
        enforcement: !!data.enforcement,
        enforcementAmount: data.enforcement ? Number(data.enforcementAmount ?? 0) : 0,
        scope: data.scope,
        fixedRate: (lfa.fixedRate as unknown[]) ?? [],
        designationRate: (lfa.designationRate as unknown[]) ?? [],
        sessionRates: (lfa.sessionRates as unknown[]) ?? [],
        breakDown: lfa.breakDown ?? false,
      }

      if (mode === "partial") {
        const bt = String(data.billingType)
        if (bt === "Hourly") {
          payload.hourlyAmendmentType = data.hourlyAmendmentType
          payload.amendmentBillingRates = {
            amendmentTypeForBilling: data.hourlyAmendmentType,
            ratesType: "Hourly",
            rate: Number(data.amendmentRate || 0),
          }
          payload.amendmentSessionRates = null
          payload.amendmentFixedRates = null
        } else if (bt === "Session") {
          payload.sessionAmendmentType = data.sessionAmendmentType
          payload.amendmentSessionRates = {
            amendmentTypeForBilling: data.sessionAmendmentType,
            ratesType: "Session",
            rate: Number(data.amendmentRate || 0),
          }
          payload.amendmentBillingRates = null
          payload.amendmentFixedRates = null
        } else {
          payload.amendmentFixedRates = {
            amendmentTypeForBilling: "Complete",
            ratesType: "Fixed",
            rate: Number(data.amendmentRate || data.fixedBillingAmount || 0),
          }
          payload.amendmentBillingRates = null
          payload.amendmentSessionRates = null
        }
        await lfaApi.partialAmend(String(lfa.id), payload)
        toast.success("Partial amendment saved")
      } else {
        await lfaApi.amend(String(lfa.id), payload)
        toast.success("LFA amendment saved")
      }
      qc.invalidateQueries({ queryKey: ["lfa"] })
      navigate(`/lfa/${lfaId}`)
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Amendment failed",
      )
    }
  }

  const title = mode === "partial" ? "Partial Amend LFA" : "Amend LFA"

  if (isLoading) {
    return (
      <PageShell title={title}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </PageShell>
    )
  }

  if (isError || !lfa?.id) {
    return (
      <PageShell title={title} breadcrumbs={[{ label: "LFA", path: "/lfa" }, { label: "Not found" }]}>
        <Typography color="text.secondary">LFA not found.</Typography>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={title}
      description={String(lfa.agreementNo ?? lfaId)}
      breadcrumbs={[
        { label: "LFA", path: "/lfa" },
        { label: String(lfa.agreementNo ?? lfaId), path: `/lfa/${lfaId}` },
        { label: mode === "partial" ? "Partial Amend" : "Amend" },
      ]}
      action={<Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>}
    >
      <Paper component="form" onSubmit={handleSubmit(onSubmit)} variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: 820 }}>
        {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

        <FormSection title="Agreement Info">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <ControlledInput name="agreementNo" control={control} label="Agreement Number" required />
            <ControlledInput name="lfaTitle" control={control} label="Title" />
            <ControlledDatePicker name="agreementDate" control={control} label="Agreement Date" required />
            <ControlledDatePicker name="applicableDate" control={control} label="Applicable Date" required />
          </Box>
          <ControlledCheckbox name="isEndDate" control={control} label="Set end date" />
          {watch("isEndDate") && <ControlledDatePicker name="endDate" control={control} label="End Date" />}
          <ControlledInput name="scope" control={control} label="Scope" multiline rows={2} />
        </FormSection>

        <FormSection title="Billing">
          <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} required />
          {billingType === "Fixed" && (
            <ControlledInput name="fixedBillingAmount" control={control} label="Fixed Amount (AED)" type="number" />
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <ControlledInput name="contingent" control={control} label="Contingent" type="number" />
            <ControlledInput name="nonContingent" control={control} label="Non Contingent" type="number" />
            <ControlledInput name="successRate" control={control} label="Success Rate" type="number" />
          </Box>
        </FormSection>

        <FormSection title="Cap & Retainer">
          <ControlledCheckbox name="cap" control={control} label="Apply billing cap" />
          {hasCap && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
              <ControlledInput name="capAmount" control={control} label="Cap Amount" type="number" />
              <ControlledSelect
                name="capThresholdType"
                control={control}
                label="Threshold Type"
                options={[{ value: "Percentage", label: "Percentage" }, { value: "Amount", label: "Amount" }]}
              />
              <ControlledInput name="threshold" control={control} label="Threshold" type="number" />
            </Box>
          )}
          <ControlledCheckbox name="retainer" control={control} label="Collect retainer" />
          {hasRetainer && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
              <ControlledInput name="retainerAmount" control={control} label="Retainer Amount" type="number" />
              <ControlledSelect
                name="retainerValidity"
                control={control}
                label="Validity"
                options={[{ value: "MONTH", label: "Month" }, { value: "YEAR", label: "Year" }]}
              />
              <ControlledInput name="retainerValidityDuration" control={control} label="Duration" type="number" />
            </Box>
          )}
        </FormSection>

        <FormSection title="Referral & Enforcement">
          <ControlledCheckbox name="referral" control={control} label="Referral fee" />
          {hasReferral && <ControlledInput name="referralPercentage" control={control} label="Referral %" type="number" />}
          <ControlledCheckbox name="enforcement" control={control} label="Enforcement billing" />
          {hasEnforcement && <ControlledInput name="enforcementAmount" control={control} label="Enforcement Amount" type="number" />}
        </FormSection>

        {mode === "partial" && (
          <FormSection title="Amendment Rates" description="Rate changes applied by this partial amendment">
            {(billingType === "Hourly" || billingType === "Session") && (
              <ControlledSelect
                name={billingType === "Hourly" ? "hourlyAmendmentType" : "sessionAmendmentType"}
                control={control}
                label="Amendment Type"
                options={[{ value: "Complete", label: "Complete" }, { value: "Individual", label: "Individual" }]}
              />
            )}
            <ControlledInput name="amendmentRate" control={control} label="New Rate / Amount" type="number" />
          </FormSection>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 2 }}>
          <Button onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : mode === "partial" ? "Save Partial Amend" : "Save Amendment"}
          </Button>
        </Box>
      </Paper>
    </PageShell>
  )
}
