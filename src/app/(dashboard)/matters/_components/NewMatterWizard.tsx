/**
 * NewMatterWizard.tsx — 3-step stepper dialog for creating a new matter.
 *
 * Step 1: Select client
 * Step 2: Matter details (subject, practice area, description, opposing party, law)
 * Step 3: Assignment & billing (department, attorney, billing type, dates)
 *
 * Live mode: POST /api/matter/add (same as MatterFormDrawer / LMS pending create).
 * Prefill from leadId still supported.
 */
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Box, Button, Typography,
  CircularProgress, Divider,
} from "@mui/material"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ControlledInput }       from "@/components/forms/ControlledInput"
import { ControlledSelect }      from "@/components/forms/ControlledSelect"
import { ControlledAsyncSelect } from "@/components/forms/ControlledAsyncSelect"
import { ControlledDatePicker }  from "@/components/forms/ControlledDatePicker"
import { env }        from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { adminApi }    from "@/api/admin"
import { leadsApi }    from "@/api/leads"
import { toast }       from "@/lib/toast"
import { logger }      from "@/lib/logger"
import { useDebounce } from "@hooks/useDebounce"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { registerOneDriveFolder } from "@lib/utils/onedrive"
import { QK } from "@lib/query/keys"

const STEPS = ["Client", "Matter Details", "Assignment"]

const BILLING_OPTIONS = [
  "Hourly", "Fixed", "Session", "Expense", "NoAgreement", "Contingent", "NonContingent",
].map(v => ({ value: v, label: v === "Fixed" ? "Fixed Fee" : v === "Session" ? "Per Session" : v === "Expense" ? "Expense Only" : v === "NoAgreement" ? "No Agreement" : v }))

const schema = z.object({
  clientId:               z.string().min(1, "Client is required"),
  matterSubject:          z.string().min(1, "Matter subject is required"),
  description:            z.string().min(1, "Description is required"),
  practiceAreaId:         z.string().min(1, "Practice area is required"),
  departmentId:           z.string().min(1, "Department is required"),
  responsibleAttorneyId:  z.string().min(1, "Responsible attorney is required"),
  applicableLawId:        z.string().optional(),
  partyOpposingFirstName: z.string().optional(),
  billingType:            z.string().min(1),
  openDate:               z.string().optional(),
  dueDate:                z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open:    boolean
  onClose: () => void
  /** Prefill from pending-matter / convert-lead flow */
  leadId?: string
}

export function NewMatterWizard({ open, onClose, leadId }: Props) {
  const [step,     setStep]     = useState(0)
  const [saving,   setSaving]   = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const debouncedClientSearch = useDebounce(clientSearch, 400)
  const navigate   = useNavigate()
  const qc         = useQueryClient()

  const { control, handleSubmit, trigger, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billingType: "Hourly",
      openDate: new Date().toISOString().slice(0, 10),
      matterSubject: "",
      description: "",
      practiceAreaId: "",
      departmentId: "",
      responsibleAttorneyId: "",
      applicableLawId: "",
      partyOpposingFirstName: "",
      clientId: "",
    },
  })

  const { data: lead } = useQuery({
    queryKey: ["leads", "detail", leadId],
    queryFn: () => leadsApi.getById(leadId!),
    enabled: Boolean(leadId) && open,
  })

  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })
  const { data: departments = [] } = useQuery({
    queryKey: QK.departments.list(),
    queryFn: () => adminApi.getDepartments(),
    enabled: open,
  })
  const { data: practiceAreas = [] } = useQuery({
    queryKey: QK.practiceAreas.list(),
    queryFn: () => adminApi.getPracticeAreas(),
    enabled: open,
  })
  const { data: applicableLaws = [] } = useQuery({
    queryKey: ["lookups", "applicableLaws"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "al1", name: "UAE Civil Code" }, { id: "al2", name: "Commercial Companies Law" }]
      const r = await axiosClient.get("/api/util/list/applicable/law")
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })
  const { data: clients = [] } = useQuery({
    queryKey: QK.clients.shortInfo(debouncedClientSearch),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "c1", clientName: "Al Rashid Holdings" }]
      const r = await axiosClient.get("/api/client/get/short-info", {
        params: { clientName: debouncedClientSearch, pageNumber: 0, pageSize: 50 },
      })
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })

  const userOpts = useMemo(() => (users as Record<string, string>[]).map(u => ({
    value: String(u.id),
    label: u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id),
  })), [users])
  const deptOpts = useMemo(() => (departments as Record<string, string>[]).map(d => ({
    value: String(d.id), label: String(d.name ?? d.id),
  })), [departments])
  const paOpts = useMemo(() => (practiceAreas as Record<string, string>[]).map(p => ({
    value: String(p.id), label: String(p.name ?? p.id),
  })), [practiceAreas])
  const lawOpts = useMemo(() => (applicableLaws as Record<string, string>[]).map(l => ({
    value: String(l.id), label: String(l.name ?? l.id),
  })), [applicableLaws])
  const clientOpts = useMemo(() => (clients as Record<string, string>[]).map(c => ({
    value: String(c.id),
    label: c.clientName || c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || String(c.id),
  })), [clients])

  useEffect(() => {
    if (!open || !lead) return
    const l = lead as unknown as Record<string, unknown>
    const client = (l.client ?? l.clientMini ?? {}) as Record<string, unknown>
    const clientId = String(l.clientId ?? client.id ?? "")
    const practice = (l.practiceArea ?? {}) as Record<string, unknown>
    const lawyer = (l.lawyer ?? l.attorney ?? {}) as Record<string, unknown>
    const dept = (l.department ?? {}) as Record<string, unknown>
    const name = String(
      l.matterSubject
      || l.companyName
      || `${String(l.firstName ?? "")} ${String(l.lastName ?? "")}`.trim()
      || l.name
      || "",
    )
    if (clientId) setValue("clientId", clientId)
    if (name) setValue("matterSubject", name)
    const desc = String(l.description ?? l.natureOfDispute ?? l.scopeOfWork ?? "")
    if (desc) setValue("description", desc)
    const paId = String(l.practiceAreaId ?? practice.id ?? "")
    if (paId) setValue("practiceAreaId", paId)
    else if (practice.name) {
      const match = paOpts.find(p => p.label === String(practice.name))
      if (match) setValue("practiceAreaId", match.value)
    }
    const lawyerId = String(l.lawyerId ?? l.attorneyId ?? lawyer.id ?? "")
    if (lawyerId) setValue("responsibleAttorneyId", lawyerId)
    const deptId = String(l.departmentId ?? dept.id ?? "")
    if (deptId) setValue("departmentId", deptId)
    if (l.billingType) setValue("billingType", String(l.billingType))
    const opposing = Array.isArray(l.partyOpposing) ? l.partyOpposing[0] as { firstName?: string } : null
    if (opposing?.firstName) setValue("partyOpposingFirstName", opposing.firstName)
  }, [lead, open, setValue, paOpts])

  const STEP_FIELDS: (keyof FormData)[][] = [
    ["clientId"],
    ["matterSubject", "description", "practiceAreaId"],
    ["departmentId", "responsibleAttorneyId", "billingType"],
  ]

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) setStep(s => s + 1)
  }

  function handleBack() { setStep(s => s - 1) }

  function handleClose() {
    reset()
    setStep(0)
    onClose()
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    logger.info("NewMatterWizard", "Creating matter via /api/matter/add", { ...data, leadId })
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 800))
        toast.success("Matter created successfully")
        qc.invalidateQueries({ queryKey: ["matters"] })
        qc.invalidateQueries({ queryKey: ["matters", "pending"] })
        handleClose()
        navigate("/matters/6a4f9f5e096c2631a41a8193")
        return
      }

      const pa = paOpts.find(p => p.value === data.practiceAreaId)
      // LMS pending create sends practiceArea as name; MatterFormDrawer uses { id }.
      // Send both shapes so backend accepts either contract.
      const payload: Record<string, unknown> = {
        title: data.matterSubject,
        matterSubject: data.matterSubject,
        description: data.description,
        client: { id: data.clientId },
        clientId: data.clientId,
        billingType: data.billingType,
        practiceArea: pa?.label ?? data.practiceAreaId,
        practiceAreaId: data.practiceAreaId,
        department: data.departmentId,
        responsibleAttorney: data.responsibleAttorneyId,
        applicableLaw: data.applicableLawId || undefined,
        partyOpposing: data.partyOpposingFirstName?.trim()
          ? [{ firstName: data.partyOpposingFirstName.trim() }]
          : [],
        openDate: data.openDate,
        dueDate: data.dueDate,
        status: "OPEN",
        matterType: "Long_Matter",
        ...(leadId ? { leadId, matterLeadId: true } : {}),
      }

      const res = await axiosClient.post("/api/matter/add", payload)
      const newId = res.data?.data?.id ?? res.data?.id
      if (newId) registerOneDriveFolder(String(newId), data.matterSubject, "Matter")
      toast.success("Matter created successfully")
      qc.invalidateQueries({ queryKey: ["matters"] })
      qc.invalidateQueries({ queryKey: ["matters", "pending"] })
      handleClose()
      if (newId) navigate(`/matters/${newId}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create matter"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {leadId ? "Create Matter from Lead" : "New Matter"}
        </Typography>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      <Divider />

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3, pb: 2, minHeight: 320 }}>

          {step === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Select an existing client or type to search.
              </Typography>
              <ControlledAsyncSelect
                name="clientId"
                control={control}
                label="Client *"
                options={clientOpts}
                onInputChange={setClientSearch}
                required
              />
            </Box>
          )}

          {step === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <ControlledInput
                name="matterSubject"
                control={control}
                label="Matter Subject *"
                placeholder="e.g. Building Dispute"
                required
              />
              <ControlledAsyncSelect
                name="practiceAreaId"
                control={control}
                label="Practice Area *"
                options={paOpts}
                required
              />
              <ControlledInput
                name="description"
                control={control}
                label="Description *"
                multiline
                rows={3}
                placeholder="Brief description of the matter…"
                required
              />
              <ControlledAsyncSelect
                name="applicableLawId"
                control={control}
                label="Applicable Law"
                options={lawOpts}
              />
              <ControlledInput
                name="partyOpposingFirstName"
                control={control}
                label="Opposing Party (First Name)"
                placeholder="Defendant / opposing party"
              />
            </Box>
          )}

          {step === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <ControlledAsyncSelect
                name="departmentId"
                control={control}
                label="Department *"
                options={deptOpts}
                required
              />
              <ControlledAsyncSelect
                name="responsibleAttorneyId"
                control={control}
                label="Responsible Attorney *"
                options={userOpts}
                required
              />
              <ControlledSelect
                name="billingType"
                control={control}
                label="Billing Type *"
                options={BILLING_OPTIONS}
              />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <ControlledDatePicker name="openDate" control={control} label="Open Date" />
                <ControlledDatePicker name="dueDate"  control={control} label="Due Date"  />
              </Box>
            </Box>
          )}

        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            {step > 0 && (
              <Button variant="outlined" onClick={handleBack}>Back</Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>Next →</Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {saving ? "Creating…" : "Create Matter"}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
