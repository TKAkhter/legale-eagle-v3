/**
 * NewMatterWizard.tsx — 3-step stepper dialog for creating a new matter.
 *
 * Step 1: Select or create client
 * Step 2: Matter details (title, practice area, description)
 * Step 3: Billing configuration (billing type, attorney, dates)
 *
 * Replaces the single-page MatterFormDrawer for the "New Matter" flow.
 * Edit flow still uses MatterFormDrawer (simpler for partial updates).
 *
 * Static mode: simulates save, navigates to matter detail with static ID.
 * Live mode:   POST /api/matter/create → navigate to /matters/:id
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Box, Button, Typography,
  CircularProgress, Divider,
} from "@mui/material"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { ControlledInput }       from "@/components/forms/ControlledInput"
import { ControlledSelect }      from "@/components/forms/ControlledSelect"
import { ControlledAsyncSelect } from "@/components/forms/ControlledAsyncSelect"
import { ControlledDatePicker }  from "@/components/forms/ControlledDatePicker"
import { env }        from "@/config/env"
import { axiosClient } from "@/lib/api/axios"
import { clientsApi }  from "@/api/clients"
import { adminApi }    from "@/api/admin"
import { toast }       from "@/lib/toast"
import { logger }      from "@/lib/logger"

const STEPS = ["Client", "Matter Details", "Billing"]

const schema = z.object({
  // Step 1
  clientId:       z.string().min(1, "Client is required"),
  // Step 2
  title:          z.string().min(1, "Matter title is required"),
  practiceAreaId: z.string().optional(),
  description:    z.string().optional(),
  // Step 3
  billingType:    z.enum(["Hourly","Fixed","Session","Expense","NoAgreement","Contingent"]),
  lawyerId:       z.string().optional(),
  openDate:       z.string().optional(),
  dueDate:        z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open:    boolean
  onClose: () => void
}

export function NewMatterWizard({ open, onClose }: Props) {
  const [step,     setStep]     = useState(0)
  const [saving,   setSaving]   = useState(false)
  const navigate   = useNavigate()
  const qc         = useQueryClient()

  const { control, handleSubmit, trigger, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { billingType: "Hourly", openDate: new Date().toISOString().slice(0,10) },
  })

  // Step field groups for validation
  const STEP_FIELDS: (keyof FormData)[][] = [
    ["clientId"],
    ["title"],
    ["billingType"],
  ]

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) setStep(s => s + 1)
  }

  function handleBack() { setStep(s => s - 1) }

  function handleClose() {
    reset(); setStep(0); onClose()
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    logger.info("NewMatterWizard", "Creating matter", data)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 800))
        toast.success("Matter created successfully")
        qc.invalidateQueries({ queryKey: ["matters"] })
        handleClose()
        navigate("/matters/6a4f9f5e096c2631a41a8193")
      } else {
        const res = await axiosClient.post("/api/matter/create", {
          clientId:       data.clientId,
          title:          data.title,
          practiceAreaId: data.practiceAreaId,
          description:    data.description,
          billingType:    data.billingType,
          lawyerId:       data.lawyerId,
          openDate:       data.openDate,
          dueDate:        data.dueDate,
        })
        const newId = res.data?.data?.id ?? res.data?.id
        toast.success("Matter created successfully")
        qc.invalidateQueries({ queryKey: ["matters"] })
        handleClose()
        if (newId) navigate(`/matters/${newId}`)
      }
    } catch (e: unknown) {
      const msg = (e as {response?:{data?:{message?:string}}})?.response?.data?.message ?? "Failed to create matter"
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
        <Typography variant="h6" sx={{ fontWeight: 700 }}>New Matter</Typography>
      </DialogTitle>

      {/* Stepper */}
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
        <DialogContent sx={{ pt: 3, pb: 2, minHeight: 280 }}>

          {/* Step 1 — Client */}
          {step === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Select an existing client or type to search.
              </Typography>
              <ControlledInput
                name="clientId"
                control={control}
                label="Client ID *"
                placeholder="Enter client ID (e.g. c1)"
                required
              />
              <Typography variant="caption" color="text.disabled">
                In live mode, this will be a searchable client picker.
              </Typography>
            </Box>
          )}

          {/* Step 2 — Matter Details */}
          {step === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <ControlledInput
                name="title"
                control={control as unknown as import('react-hook-form').Control<import('react-hook-form').FieldValues>}
                label="Matter Title *"
                placeholder="e.g. 260303 — Building Dispute"
                required
              />
              <ControlledSelect
                name="practiceAreaId"
                control={control}
                label="Practice Area"
                options={[
                  { value:"pa1", label:"Corporate" },
                  { value:"pa2", label:"Litigation" },
                  { value:"pa3", label:"Family Law" },
                  { value:"pa4", label:"Real Estate" },
                  { value:"pa5", label:"Employment" },
                  { value:"pa6", label:"Criminal" },
                ]}
              />
              <ControlledInput
                name="description"
                control={control as unknown as import('react-hook-form').Control<import('react-hook-form').FieldValues>}
                label="Description"
                multiline
                rows={3}
                placeholder="Brief description of the matter…"
              />
            </Box>
          )}

          {/* Step 3 — Billing */}
          {step === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <ControlledSelect
                name="billingType"
                control={control as unknown as import('react-hook-form').Control<import('react-hook-form').FieldValues>}
                label="Billing Type *"
                options={[
                  { value:"Hourly",      label:"Hourly" },
                  { value:"Fixed",       label:"Fixed Fee" },
                  { value:"Session",     label:"Per Session" },
                  { value:"Expense",     label:"Expense Only" },
                  { value:"NoAgreement", label:"No Agreement" },
                  { value:"Contingent",  label:"Contingent" },
                ]}
              />
              <ControlledSelect
                name="lawyerId"
                control={control}
                label="Responsible Attorney"
                options={[
                  { value:"u1", label:"Sarah Johnson" },
                  { value:"u2", label:"Dory Abi Khalil" },
                  { value:"u3", label:"Mashood Rafi" },
                ]}
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
