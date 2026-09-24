import { z } from "zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { ControlledInput, ControlledSelect, ControlledAsyncSelect, FormSection } from "@components/forms"
import { useDraftSave } from "@/hooks/useDraftSave"
import { DraftBanner } from "@/components/ui/DraftBanner"
import { leadsApi } from "@/api/leads"
import { adminApi } from "@/api/admin"

const schema = z.object({
  firstName:      z.string().min(1, "Required"),
  lastName:       z.string().optional(),
  companyName:    z.string().optional(),
  leadType:       z.enum(["COMPANY","PERSON"]),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().optional(),
  practiceAreaId: z.string().optional(),
  leadSourceId:   z.string().optional(),
  lawyerId:       z.string().optional(),
  description:    z.string().optional(),
})
type LeadForm = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  leadId?: string
  onSaved: () => void
  /** When true, create payload includes `internal: true` (internal-leads flow). */
  internal?: boolean
}

export function LeadFormDrawer({ open, onClose, leadId, onSaved, internal = false }: Props) {
  const isEdit = !!leadId
  const [error, setError] = useState("")

  const { control, handleSubmit, reset, getValues, formState: { isSubmitting } } = useForm<LeadForm>({
    resolver: zodResolver(schema),
    defaultValues: { leadType: "PERSON" },
  })

  const { hasDraft, loadDraft, clearDraft } = useDraftSave(
    internal ? "internal-lead-form" : "lead-form",
    getValues,
    reset,
    isEdit,
  )

  const { data: existing } = useQuery({
    queryKey: ["leads","detail",leadId],
    queryFn: () => leadsApi.getById(leadId!),
    enabled: !!leadId && open,
  })

  const { data: users  = [] } = useQuery({ queryKey: ["users","min"],      queryFn: () => adminApi.getUsersMin()      })
  const { data: pas    = [] } = useQuery({ queryKey: ["practiceAreas"],    queryFn: () => adminApi.getPracticeAreas() })
  const { data: srcs   = [] } = useQuery({ queryKey: ["leadSources"],      queryFn: () => adminApi.getLeadSources()   })

  useEffect(() => {
    if (!open) { reset({ leadType: "PERSON" }); setError("") }
  }, [open, reset])

  useEffect(() => {
    if (existing && isEdit) {
      const e = existing as {
        firstName?: string
        lastName?: string
        companyName?: string
        leadType?: string
        email?: string
        phone?: string
        practiceAreaId?: string
        leadSourceId?: string
        attorneyId?: string
        description?: string
      }
      const leadType = e.leadType === "COMPANY" || e.leadType === "Company" ? "COMPANY" : "PERSON"
      reset({
        firstName: e.firstName ?? "",
        lastName: e.lastName ?? "",
        companyName: e.companyName ?? "",
        leadType,
        email: e.email ?? "",
        phone: e.phone ?? "",
        practiceAreaId: e.practiceAreaId,
        leadSourceId: e.leadSourceId,
        lawyerId: e.attorneyId,
        description: e.description ?? "",
      })
    }
  }, [existing, isEdit, reset])

  const toOpts = (arr: unknown[]) => (arr as Record<string,string>[]).map(x => ({ value: x.id, label: x.firstName ? `${x.firstName} ${x.lastName}` : x.name }))

  async function onSubmit(vals: LeadForm) {
    setError("")
    try {
      const payload = {
        ...vals,
        ...(internal && !isEdit ? { internal: true } : {}),
        emails: vals.email ? [{ emailId: vals.email, type: "Work", primary: true }] : [],
        phones: vals.phone ? [{ phoneNo: vals.phone, type: "Mobile", primary: true }] : [],
        practiceArea: vals.practiceAreaId ? { id: vals.practiceAreaId } : undefined,
        leadSource:   vals.leadSourceId   ? { id: vals.leadSourceId }   : undefined,
        lawyer:       vals.lawyerId       ? { id: vals.lawyerId }       : undefined,
      }
      if (isEdit) await leadsApi.update(leadId!, payload as Record<string,unknown>)
      else        await leadsApi.create(payload as Record<string,unknown>)
      clearDraft()
      onSaved()
    } catch (e: unknown) {
      setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message ?? "Something went wrong")
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? (internal ? "Edit Internal Lead" : "Edit Lead") : (internal ? "New Internal Lead" : "New Lead")}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? "Update" : (internal ? "Create Internal Lead" : "Create Lead")}
    >
      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}
      {hasDraft && !isEdit && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
    <FormSection title="Basic Info">
        <ControlledSelect name="leadType" control={control} label="Lead Type"
          options={[{value:"PERSON",label:"Individual"},{value:"COMPANY",label:"Company"}]} />
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName"  control={control} label="Last Name" />
        </Box>
        <ControlledInput name="companyName" control={control} label="Company Name" />
      </FormSection>
      {hasDraft && !isEdit && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
    <FormSection title="Contact">
        <ControlledInput name="email" control={control} label="Email" type="email" />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>
      {hasDraft && !isEdit && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
    <FormSection title="Assignment">
        <ControlledAsyncSelect name="lawyerId"       control={control} label="Responsible Attorney" options={toOpts(users)} />
        <ControlledAsyncSelect name="practiceAreaId" control={control} label="Practice Area"        options={toOpts(pas)}   />
        <ControlledAsyncSelect name="leadSourceId"   control={control} label="Lead Source"          options={toOpts(srcs)}  />
      </FormSection>
      {hasDraft && !isEdit && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
    <FormSection title="Notes">
        <ControlledInput name="description" control={control} label="Notes" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
