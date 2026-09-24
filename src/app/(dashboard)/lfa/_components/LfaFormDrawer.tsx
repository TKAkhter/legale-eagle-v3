/**
 * LFA create/edit — LMS AddLFA / EditLFA parity (FormDrawer).
 * Client, dates, billing tabs (Hourly/Session/Fixed), cap, retainer, referral, file upload.
 */
import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledDatePicker } from "@components/forms/ControlledDatePicker"
import { ControlledCheckbox } from "@components/forms/ControlledCheckbox"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { ClientSelectFilter } from "@components/filters/ClientSelectFilter"
import { QK } from "@lib/query/keys"
import { lfaApi } from "@/api/lfa"
import { adminApi } from "@/api/admin"
import { clientsApi } from "@/api/clients"
import { env } from "@/config/env"

const BILLING_OPTS = [
  { value: "Fixed", label: "Fixed" },
  { value: "Hourly", label: "Hourly" },
  { value: "Session", label: "Session" },
]

type HourlyRow = {
  designationId?: string
  designationName?: string
  title?: string
  rate: number
  defaultRate?: number
}

type SessionRow = {
  sessionRateId?: string
  sessionTypeName?: string
  title?: string
  rate: number
  defaultRate?: number
}

type FixedRow = {
  breakDown?: string
  title?: string
  rate: number
  percentage?: number
  advance?: boolean
  breakdownDate?: string
}

type FormValues = {
  autoSeq: boolean
  agreementNo: string
  client: string
  lfaTitle: string
  scope: string
  agreementDate: string
  applicableDate: string
  isEndDate: boolean
  endDate: string
  billingType: string
  fixedBillingAmount: string
  contingent: string
  nonContingent: string
  successRate: string
  successRateType: string
  advance: boolean
  advanceAmount: string
  ratesType: string
  breakDown: boolean
  breakDownType: string
  cap: boolean
  capAmount: string
  capThresholdType: string
  threshold: string
  retainer: boolean
  retainerAmount: string
  retainerValidity: string
  retainerValidityDuration: string
  retainerMaximumHr: string
  referral: boolean
  referralPercentage: string
  referralSource: string
  referralUserId: string
  referralPartnerId: string
  designationRate: HourlyRow[]
  sessionRates: SessionRow[]
  fixedRate: FixedRow[]
  lfa: unknown
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusYearsIso(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

function numOr(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

interface Props {
  open: boolean
  onClose: () => void
  lfaId?: string
  clientId?: string
  onSuccess?: () => void
}

export function LfaFormDrawer({ open, onClose, lfaId, clientId: fixedClientId, onSuccess }: Props) {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileLabel, setFileLabel] = useState("")
  const isEdit = !!lfaId

  const { control, handleSubmit, watch, reset, setValue, getValues, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      autoSeq: true,
      agreementNo: "",
      client: fixedClientId ?? "",
      lfaTitle: "",
      scope: "",
      agreementDate: todayIso(),
      applicableDate: todayIso(),
      isEndDate: false,
      endDate: plusYearsIso(1),
      billingType: "Fixed",
      fixedBillingAmount: "",
      contingent: "0",
      nonContingent: "0",
      successRate: "0",
      successRateType: "Flat",
      advance: false,
      advanceAmount: "",
      ratesType: "Default",
      breakDown: false,
      breakDownType: "Amount",
      cap: false,
      capAmount: "0",
      capThresholdType: "Percentage",
      threshold: "0",
      retainer: false,
      retainerAmount: "",
      retainerValidity: "MONTH",
      retainerValidityDuration: "1",
      retainerMaximumHr: "0",
      referral: false,
      referralPercentage: "",
      referralSource: "",
      referralUserId: "",
      referralPartnerId: "",
      designationRate: [],
      sessionRates: [],
      fixedRate: [],
      lfa: null,
    },
  })

  const { fields: hourlyFields, replace: replaceHourly } = useFieldArray({ control, name: "designationRate" })
  const { fields: sessionFields, replace: replaceSession } = useFieldArray({ control, name: "sessionRates" })
  const { fields: fixedFields, replace: replaceFixed, append: appendFixed, remove: removeFixed } =
    useFieldArray({ control, name: "fixedRate" })

  const billingType = useWatch({ control, name: "billingType" })
  const autoSeq = useWatch({ control, name: "autoSeq" })
  const isEndDate = useWatch({ control, name: "isEndDate" })
  const hasCap = useWatch({ control, name: "cap" })
  const hasRetainer = useWatch({ control, name: "retainer" })
  const hasReferral = useWatch({ control, name: "referral" })
  const referralSource = useWatch({ control, name: "referralSource" })
  const breakDown = useWatch({ control, name: "breakDown" })
  const advance = useWatch({ control, name: "advance" })
  const ratesType = useWatch({ control, name: "ratesType" })
  const clientId = useWatch({ control, name: "client" })

  const titlesQ = useQuery({
    queryKey: ["lfa", "titles"],
    enabled: open,
    queryFn: () => lfaApi.getLfaTitles(),
    staleTime: 60_000,
  })
  const usersQ = useQuery({
    queryKey: ["users", "min", "lfa-form"],
    enabled: open && hasReferral && referralSource === "Internal",
    queryFn: () => adminApi.getUsersMin(),
  })
  const partnersQ = useQuery({
    queryKey: ["lfa", "referral-partners"],
    enabled: open && hasReferral && (referralSource === "ReferralPartner" || referralSource === "External"),
    queryFn: () => lfaApi.getReferralPartners(),
  })

  const titleOpts = useMemo(() => {
    const list = (titlesQ.data ?? []) as { id?: string; name?: string }[]
    return list.map(t => ({ value: String(t.name ?? t.id ?? ""), label: String(t.name ?? t.id ?? "") }))
  }, [titlesQ.data])

  const userOpts = useMemo(() => {
    const list = (usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]
    return list.map(u => ({
      value: String(u.id ?? ""),
      label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id),
    }))
  }, [usersQ.data])

  const partnerOpts = useMemo(() => {
    const list = (partnersQ.data ?? []) as { id?: string; name?: string; companyName?: string }[]
    return list.map(p => ({
      value: String(p.id ?? ""),
      label: String(p.name ?? p.companyName ?? p.id ?? ""),
    }))
  }, [partnersQ.data])

  async function seedHourly(useDefaultRates: boolean) {
    const list = await lfaApi.getDefaultHourlyRates() as Record<string, unknown>[]
    const rows = (Array.isArray(list) ? list : []).map(r => {
      const des = r.designation as { id?: string; name?: string } | null
      const defaultRate = Number(r.rate ?? r.defaultRate ?? 0)
      return {
        designationId: des?.id,
        designationName: des?.name ?? String(r.name ?? ""),
        title: des?.name ?? String(r.name ?? ""),
        rate: useDefaultRates ? defaultRate : 0,
        defaultRate,
      }
    })
    if (rows.length) replaceHourly(rows)
  }

  async function seedSession() {
    const list = await lfaApi.getDefaultSessionRates() as Record<string, unknown>[]
    const rows = (Array.isArray(list) ? list : []).map(r => ({
      sessionRateId: String(r.id ?? ""),
      sessionTypeName: String(r.typeName ?? r.name ?? ""),
      title: String(r.typeName ?? r.name ?? ""),
      rate: Number(r.rate ?? 0),
      defaultRate: Number(r.rate ?? 0),
    }))
    if (rows.length) replaceSession(rows)
  }

  async function seedBreakdown() {
    const list = await lfaApi.getBreakdownTypes() as Record<string, unknown>[]
    const rows = (Array.isArray(list) ? list : []).map(b => ({
      breakDown: String(b.id ?? ""),
      title: String(b.name ?? ""),
      rate: 0,
      percentage: 0,
      advance: false,
      breakdownDate: "",
    }))
    if (rows.length) replaceFixed(rows)
  }

  useEffect(() => {
    if (!open) {
      reset()
      setFileLabel("")
      setSubmitError(null)
      return
    }
    if (isEdit) return
    setValue("client", fixedClientId ?? "")
    void (async () => {
      if (billingType === "Hourly") await seedHourly(ratesType === "Default")
      else if (billingType === "Session") await seedSession()
      else if (billingType === "Fixed") await seedBreakdown()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, billingType])

  useEffect(() => {
    if (!open || isEdit || billingType !== "Hourly") return
    void seedHourly(ratesType === "Default")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratesType])

  useEffect(() => {
    if (!open || isEdit || billingType !== "Fixed" || !breakDown) return
    if (!fixedFields.length) void seedBreakdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakDown])

  useEffect(() => {
    if (!open || !isEdit || !lfaId) return
    void lfaApi.getById(lfaId).then(async (raw) => {
      const d = raw as Record<string, unknown>
      const client = (d.client ?? d.clients) as { id?: string } | null
      const end = String(d.endDate ?? "").slice(0, 10)
      reset({
        autoSeq: Boolean(d.autoSeq ?? true),
        agreementNo: String(d.agreementNo ?? ""),
        client: String(d.clientId ?? client?.id ?? fixedClientId ?? ""),
        lfaTitle: String(d.lfaTitle ?? ""),
        scope: String(d.scope ?? ""),
        agreementDate: String(d.agreementDate ?? todayIso()).slice(0, 10),
        applicableDate: String(d.applicableDate ?? d.agreementDate ?? todayIso()).slice(0, 10),
        isEndDate: Boolean(end),
        endDate: end || plusYearsIso(1),
        billingType: String(d.billingType ?? "Fixed"),
        fixedBillingAmount: d.fixedBillingAmount != null ? String(d.fixedBillingAmount) : "",
        contingent: d.contingent != null ? String(d.contingent) : "0",
        nonContingent: d.nonContingent != null ? String(d.nonContingent) : "0",
        successRate: d.successRate != null ? String(d.successRate) : "0",
        successRateType: String(d.successRateType ?? "Flat"),
        advance: Boolean(d.advance),
        advanceAmount: d.advanceAmount != null ? String(d.advanceAmount) : "",
        ratesType: "Default",
        breakDown: Boolean(d.breakDown),
        breakDownType: String(d.breakDownType ?? "Amount"),
        cap: Boolean(d.cap),
        capAmount: d.capAmount != null ? String(d.capAmount) : "0",
        capThresholdType: String(d.capThresholdType ?? "Percentage"),
        threshold: d.threshold != null ? String(d.threshold) : "0",
        retainer: Boolean(d.retainer),
        retainerAmount: d.retainerAmount != null ? String(d.retainerAmount) : "",
        retainerValidity: String(d.retainerValidity ?? "MONTH"),
        retainerValidityDuration: d.retainerValidityDuration != null ? String(d.retainerValidityDuration) : "1",
        retainerMaximumHr: d.retainerMaximumHr != null ? String(d.retainerMaximumHr) : "0",
        referral: Boolean(d.referral),
        referralPercentage: d.referralPercentage != null ? String(d.referralPercentage) : "",
        referralSource: String(d.referralSource ?? ""),
        referralUserId: String(d.referralUserId ?? ""),
        referralPartnerId: String(d.referralPartnerId ?? d.referralId ?? ""),
        designationRate: [],
        sessionRates: [],
        fixedRate: Array.isArray(d.fixedRate) ? (d.fixedRate as FixedRow[]) : [],
        lfa: d.lfa ?? null,
      })
      if (d.lfa) setFileLabel("Agreement on file")
      try {
        const rates = await lfaApi.getRates(lfaId) as Record<string, unknown>[]
        const hourly = rates.filter(r => String(r.billingType ?? "Hourly") === "Hourly").map(r => {
          const des = r.designation as { id?: string; name?: string } | null
          return {
            designationId: des?.id ?? String(r.designationId ?? ""),
            designationName: des?.name ?? String(r.name ?? r.title ?? ""),
            title: des?.name ?? String(r.name ?? r.title ?? ""),
            rate: Number(r.rate ?? r.hourlyRate ?? 0),
            defaultRate: Number(r.defaultRate ?? 0),
          }
        })
        const session = rates.filter(r => String(r.billingType) === "Session").map(r => {
          const st = r.sessionTypeName as { typeName?: string } | string | null
          return {
            sessionRateId: String(r.sessionRateId ?? r.id ?? ""),
            sessionTypeName: typeof st === "object" ? (st?.typeName ?? "") : String(st ?? r.title ?? r.name ?? ""),
            title: typeof st === "object" ? (st?.typeName ?? "") : String(st ?? r.title ?? r.name ?? ""),
            rate: Number(r.rate ?? 0),
            defaultRate: Number(r.defaultRate ?? 0),
          }
        })
        if (hourly.length) replaceHourly(hourly)
        if (session.length) replaceSession(session)
      } catch { /* keep empty */ }
    })
  }, [open, isEdit, lfaId, fixedClientId, reset, replaceHourly, replaceSession])

  async function onFileChange(file: File | undefined) {
    if (!file) return
    const cid = getValues("client")
    if (!cid) {
      setSubmitError("Select a client before uploading the agreement.")
      return
    }
    setUploading(true)
    setSubmitError(null)
    try {
      let uuid = cid
      if (!env.USE_STATIC_DATA) {
        try {
          const client = await clientsApi.getById(cid) as { uuid?: string }
          if (client?.uuid) uuid = client.uuid
        } catch { /* use id */ }
      }
      const uploaded = await lfaApi.uploadAgreementFile(file, uuid)
      setValue("lfa", uploaded)
      setFileLabel(file.name)
    } catch {
      setSubmitError("Failed to upload agreement file.")
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    if (!data.client && !isEdit) {
      setSubmitError("Client is required.")
      return
    }
    if (!data.autoSeq && !data.agreementNo.trim()) {
      setSubmitError("Agreement number is required when Auto Generate is Manual.")
      return
    }
    if (!data.agreementDate || !data.applicableDate) {
      setSubmitError("Agreement date and applicable date are required.")
      return
    }
    if (data.referral && data.referralSource === "Internal" && !data.referralUserId) {
      setSubmitError("Please select a referral internal user.")
      return
    }

    const capAmount = data.cap ? numOr(data.capAmount) : 0
    const threshold = numOr(data.threshold)
    const capThresholdAmount = data.capThresholdType === "Percentage"
      ? Number(((capAmount * threshold) / 100).toFixed(2))
      : threshold

    let retainerEndDate = ""
    if (data.billingType === "Fixed" && data.retainer) {
      const base = new Date(data.agreementDate || todayIso())
      const dur = numOr(data.retainerValidityDuration, 1)
      if (data.retainerValidity === "YEAR") base.setFullYear(base.getFullYear() + dur)
      else base.setMonth(base.getMonth() + dur)
      retainerEndDate = base.toISOString().slice(0, 10)
    }

    const designationRate = data.designationRate.map(r => ({
      designationId: r.designationId,
      designation: r.designationId
        ? { id: r.designationId, name: r.designationName ?? r.title }
        : { name: r.designationName ?? r.title },
      rate: numOr(r.rate),
      defaultRate: numOr(r.defaultRate ?? r.rate),
      title: r.title ?? r.designationName,
    }))

    const sessionRates = data.sessionRates.map(r => ({
      sessionRateId: r.sessionRateId,
      sessionTypeName: { typeName: r.sessionTypeName ?? r.title },
      rate: numOr(r.rate),
      defaultRate: numOr(r.defaultRate ?? r.rate),
      title: r.title ?? r.sessionTypeName,
    }))

    const fixedRate = data.breakDown
      ? data.fixedRate.map(r => ({
          breakDown: r.breakDown,
          title: r.title,
          rate: numOr(r.rate),
          percentage: numOr(r.percentage),
          advance: Boolean(r.advance),
          breakdownDate: r.breakdownDate || undefined,
        }))
      : []

    const payload: Record<string, unknown> = {
      autoSeq: data.autoSeq,
      agreementNo: data.agreementNo,
      client: data.client,
      lfaTitle: data.lfaTitle,
      scope: data.scope,
      agreementDate: data.agreementDate,
      applicableDate: data.applicableDate,
      endDate: data.isEndDate ? data.endDate : "",
      isEndDate: data.isEndDate,
      billingType: data.billingType,
      fixedBillingAmount: data.billingType === "Fixed" ? numOr(data.fixedBillingAmount) : undefined,
      contingent: numOr(data.contingent),
      nonContingent: numOr(data.nonContingent),
      successRate: numOr(data.successRate),
      successRateType: data.successRateType,
      advance: data.advance,
      advanceAmount: data.advance ? numOr(data.advanceAmount) : undefined,
      ratesType: data.ratesType,
      breakDown: data.billingType === "Fixed" ? data.breakDown : false,
      breakDownType: data.breakDownType,
      fixedRate: data.billingType === "Fixed" ? fixedRate : undefined,
      designationRate: data.billingType === "Hourly" ? designationRate : undefined,
      sessionRates: data.billingType === "Session" ? sessionRates : undefined,
      cap: data.cap,
      capAmount,
      capThresholdType: data.capThresholdType,
      threshold,
      capThresholdAmount,
      retainer: data.billingType === "Fixed" ? data.retainer : false,
      retainerAmount: data.billingType === "Fixed" && data.retainer ? numOr(data.retainerAmount) : undefined,
      retainerValidity: data.retainerValidity,
      retainerValidityDuration: data.billingType === "Fixed" && data.retainer
        ? numOr(data.retainerValidityDuration)
        : 0,
      retainerMaximumHr: data.billingType === "Fixed" && data.retainer
        ? numOr(data.retainerMaximumHr)
        : 0,
      retainerEndDate: data.billingType === "Fixed" && data.retainer ? retainerEndDate : "",
      referral: data.referral,
      referralPercentage: data.referral ? numOr(data.referralPercentage) : undefined,
      referralSource: data.referral ? data.referralSource : "",
      referralUserId: data.referral && data.referralSource === "Internal" ? data.referralUserId : "",
      referralPartnerId: data.referral && data.referralSource !== "Internal" ? data.referralPartnerId : "",
      lfa: data.lfa ?? undefined,
    }

    try {
      if (isEdit) await lfaApi.update(String(lfaId), payload)
      else await lfaApi.create(payload)
      qc.invalidateQueries({ queryKey: QK.lfa.all() })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Something went wrong. Please try again.",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit LFA" : "New LFA"}
      subtitle="Legal Fee Agreement configuration"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting || uploading}
      submitLabel={isEdit ? "Update" : "Create LFA"}
      width={720}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>
      )}

      <FormSection title="Agreement Info">
        <FormControl size="small" fullWidth>
          <InputLabel>Auto Generate</InputLabel>
          <Select
            label="Auto Generate"
            value={autoSeq ? "true" : "false"}
            onChange={e => setValue("autoSeq", e.target.value === "true")}
          >
            <MenuItem value="true">Auto</MenuItem>
            <MenuItem value="false">Manual</MenuItem>
          </Select>
        </FormControl>
        <ControlledInput
          name="agreementNo"
          control={control}
          label="Agreement Number"
          required={!autoSeq}
          disabled={autoSeq}
        />
        {!fixedClientId && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              Client *
            </Typography>
            <ClientSelectFilter
              value={clientId || undefined}
              onChange={v => setValue("client", v ?? "")}
              label="Client"
            />
          </Box>
        )}
        {titleOpts.length > 0 ? (
          <ControlledAsyncSelect name="lfaTitle" control={control} label="LFA Title" options={titleOpts} />
        ) : (
          <ControlledInput name="lfaTitle" control={control} label="Title / Description" />
        )}
        <ControlledDatePicker
          name="agreementDate"
          control={control}
          label="Agreement Date"
          required
        />
        <ControlledDatePicker
          name="applicableDate"
          control={control}
          label="Applicable Date"
          required
        />
        <FormControl>
          <FormLabel>End Date?</FormLabel>
          <RadioGroup
            row
            value={isEndDate ? "yes" : "no"}
            onChange={e => setValue("isEndDate", e.target.value === "yes")}
          >
            <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </FormControl>
        {isEndDate && (
          <ControlledDatePicker name="endDate" control={control} label="End Date" required />
        )}
        <ControlledInput name="scope" control={control} label="LFA Scope" multiline rows={3} />
        <Box>
          <Button component="label" size="small" variant="outlined" disabled={uploading || !clientId}>
            {uploading ? "Uploading…" : "Upload Agreement"}
            <input
              type="file"
              hidden
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => { void onFileChange(e.target.files?.[0]) }}
            />
          </Button>
          {fileLabel && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {fileLabel}
            </Typography>
          )}
        </Box>
      </FormSection>

      <FormSection title="Billing Structure">
        <ControlledSelect name="billingType" control={control} label="Billing Type" options={BILLING_OPTS} required />
        {billingType === "Fixed" && (
          <ControlledInput name="fixedBillingAmount" control={control} label="Fixed Amount" type="number" required />
        )}
        {(billingType === "Hourly" || billingType === "Session") && (
          <>
            <FormControl>
              <FormLabel>Advance</FormLabel>
              <RadioGroup
                row
                value={advance ? "yes" : "no"}
                onChange={e => setValue("advance", e.target.value === "yes")}
              >
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              </RadioGroup>
            </FormControl>
            {advance && (
              <ControlledInput name="advanceAmount" control={control} label="Advance Amount" type="number" />
            )}
          </>
        )}
        <ControlledInput name="contingent" control={control} label="Contingent %" type="number" />
        <ControlledInput name="nonContingent" control={control} label="Non-Contingent %" type="number" />
        <ControlledSelect
          name="successRateType"
          control={control}
          label="Success Rate Type"
          options={[
            { value: "Flat", label: "Flat" },
            { value: "Percentage", label: "Percentage" },
          ]}
        />
        <ControlledInput name="successRate" control={control} label="Success Rate" type="number" />
      </FormSection>

      {billingType === "Hourly" && (
        <FormSection title="Hourly Rates">
          <FormControl>
            <FormLabel>Rating Type</FormLabel>
            <RadioGroup
              row
              value={ratesType}
              onChange={e => setValue("ratesType", e.target.value)}
            >
              <FormControlLabel value="hourlyRate" control={<Radio size="small" />} label="Hourly Rate" />
              <FormControlLabel value="Default" control={<Radio size="small" />} label="Default" />
            </RadioGroup>
          </FormControl>
          {hourlyFields.map((field, idx) => (
            <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 1, mb: 1 }}>
              <ControlledInput
                name={`designationRate.${idx}.designationName`}
                control={control}
                label={field.title || "Designation"}
                disabled
              />
              <ControlledInput name={`designationRate.${idx}.rate`} control={control} label="Rate" type="number" />
            </Box>
          ))}
          {!hourlyFields.length && (
            <Typography variant="caption" color="text.secondary">No designation rates loaded.</Typography>
          )}
        </FormSection>
      )}

      {billingType === "Session" && (
        <FormSection title="Session Rates">
          {sessionFields.map((field, idx) => (
            <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 1, mb: 1 }}>
              <ControlledInput
                name={`sessionRates.${idx}.sessionTypeName`}
                control={control}
                label={field.title || "Session Type"}
                disabled
              />
              <ControlledInput name={`sessionRates.${idx}.rate`} control={control} label="Rate" type="number" />
            </Box>
          ))}
          {!sessionFields.length && (
            <Typography variant="caption" color="text.secondary">No session rates loaded.</Typography>
          )}
        </FormSection>
      )}

      {billingType === "Fixed" && (
        <FormSection title="Fixed Breakdown">
          <ControlledCheckbox name="breakDown" control={control} label="Break down fixed amount" />
          {breakDown && (
            <>
              <FormControl>
                <FormLabel>Break Down Type</FormLabel>
                <RadioGroup
                  row
                  value={watch("breakDownType")}
                  onChange={e => setValue("breakDownType", e.target.value)}
                >
                  <FormControlLabel value="Amount" control={<Radio size="small" />} label="Amount" />
                  <FormControlLabel value="Percentage" control={<Radio size="small" />} label="Percentage" />
                </RadioGroup>
              </FormControl>
              {fixedFields.map((field, idx) => (
                <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 40px", gap: 1, mb: 1, alignItems: "center" }}>
                  <ControlledInput name={`fixedRate.${idx}.title`} control={control} label="Category" disabled />
                  <ControlledInput name={`fixedRate.${idx}.rate`} control={control} label="Amount" type="number" />
                  <ControlledInput name={`fixedRate.${idx}.percentage`} control={control} label="%" type="number" />
                  <IconButton size="small" onClick={() => removeFixed(idx)} aria-label="Remove">
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box
                component="button"
                type="button"
                onClick={() => appendFixed({ title: "", rate: 0, percentage: 0, advance: false })}
                sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.5, border: "none", background: "none",
                  color: "primary.main", cursor: "pointer", fontSize: 13, fontWeight: 600, p: 0,
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} /> Add breakdown row
              </Box>
            </>
          )}
        </FormSection>
      )}

      {billingType === "Hourly" && (
        <FormSection title="Price Cap">
          <ControlledCheckbox name="cap" control={control} label="Apply a billing cap" />
          {hasCap && (
            <>
              <ControlledInput name="capAmount" control={control} label="Cap Amount" type="number" />
              <ControlledSelect
                name="capThresholdType"
                control={control}
                label="Threshold Type"
                options={[
                  { value: "Percentage", label: "Percentage" },
                  { value: "Amount", label: "Amount" },
                ]}
              />
              <ControlledInput name="threshold" control={control} label="Threshold" type="number" />
            </>
          )}
        </FormSection>
      )}

      {billingType === "Fixed" && (
        <FormSection title="Retainer">
          <ControlledCheckbox name="retainer" control={control} label="Collect a retainer" />
          {hasRetainer && (
            <>
              <ControlledInput name="retainerAmount" control={control} label="Retainer Amount" type="number" />
              <ControlledSelect
                name="retainerValidity"
                control={control}
                label="Validity Unit"
                options={[
                  { value: "MONTH", label: "Month" },
                  { value: "YEAR", label: "Year" },
                ]}
              />
              <ControlledInput name="retainerValidityDuration" control={control} label="Duration" type="number" />
              <ControlledInput name="retainerMaximumHr" control={control} label="Max Hours" type="number" />
            </>
          )}
        </FormSection>
      )}

      <FormSection title="Referral">
        <ControlledCheckbox name="referral" control={control} label="This agreement has a referral fee" />
        {hasReferral && (
          <>
            <ControlledInput name="referralPercentage" control={control} label="Referral %" type="number" />
            <ControlledSelect
              name="referralSource"
              control={control}
              label="Referral Source"
              options={[
                { value: "Internal", label: "Internal" },
                { value: "External", label: "External" },
                { value: "ReferralPartner", label: "Referral Partner" },
              ]}
            />
            {referralSource === "Internal" && (
              <ControlledAsyncSelect
                name="referralUserId"
                control={control}
                label="Referral User"
                options={userOpts}
                required
              />
            )}
            {(referralSource === "External" || referralSource === "ReferralPartner") && (
              <ControlledAsyncSelect
                name="referralPartnerId"
                control={control}
                label="Referral Partner"
                options={partnerOpts}
              />
            )}
          </>
        )}
      </FormSection>
    </FormDrawer>
  )
}
