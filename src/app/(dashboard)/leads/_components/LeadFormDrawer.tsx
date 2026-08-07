import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { ControlledInput, ControlledSelect, ControlledAsyncSelect, FormSection } from "@components/forms"
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
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; leadId?: string; onSaved: () => void }

export function LeadFormDrawer({ open, onClose, leadId, onSaved }: Props) {
  const isEdit = !!leadId
  const [error, setError] = useState("")

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { leadType: "PERSON" },
  })

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
      const e = existing as Record<string,unknown>
      reset({
        firstName: String(e.firstName??""), lastName: String(e.lastName??""),
        companyName: String(e.companyName??""), leadType: (e.leadType as "PERSON"|"COMPANY") ?? "PERSON",
        email: (e.emails as {emailId:string}[])?.[0]?.emailId ?? String(e.email??""),
        phone: (e.phones as {phoneNo:string}[])?.[0]?.phoneNo ?? String(e.phone??""),
        practiceAreaId: (e.practiceArea as {id:string})?.id,
        leadSourceId:   (e.leadSource   as {id:string})?.id,
        lawyerId:       (e.lawyer       as {id:string})?.id,
        description:    String(e.description??""),
      })
    }
  }, [existing, isEdit, reset])

  const toOpts = (arr: unknown[]) => (arr as Record<string,string>[]).map(x => ({ value: x.id, label: x.firstName ? `${x.firstName} ${x.lastName}` : x.name }))

  async function onSubmit(vals: Form) {
    setError("")
    try {
      const payload = {
        ...vals,
        emails: vals.email ? [{ emailId: vals.email, type: "Work", primary: true }] : [],
        phones: vals.phone ? [{ phoneNo: vals.phone, type: "Mobile", primary: true }] : [],
        practiceArea: vals.practiceAreaId ? { id: vals.practiceAreaId } : undefined,
        leadSource:   vals.leadSourceId   ? { id: vals.leadSourceId }   : undefined,
        lawyer:       vals.lawyerId       ? { id: vals.lawyerId }       : undefined,
      }
      if (isEdit) await leadsApi.update(leadId!, payload as Record<string,unknown>)
      else        await leadsApi.create(payload as Record<string,unknown>)
      onSaved()
    } catch (e: unknown) {
      setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message ?? "Something went wrong")
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEdit ? "Edit Lead" : "New Lead"}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting} submitLabel={isEdit ? "Update" : "Create Lead"}>
      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}
      <FormSection title="Basic Info">
        <ControlledSelect name="leadType" control={control} label="Lead Type"
          options={[{value:"PERSON",label:"Individual"},{value:"COMPANY",label:"Company"}]} />
        <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
          <ControlledInput name="firstName" control={control} label="First Name" required />
          <ControlledInput name="lastName"  control={control} label="Last Name" />
        </Box>
        <ControlledInput name="companyName" control={control} label="Company Name" />
      </FormSection>
      <FormSection title="Contact">
        <ControlledInput name="email" control={control} label="Email" type="email" />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>
      <FormSection title="Assignment">
        <ControlledAsyncSelect name="lawyerId"       control={control} label="Responsible Attorney" options={toOpts(users)} />
        <ControlledAsyncSelect name="practiceAreaId" control={control} label="Practice Area"        options={toOpts(pas)}   />
        <ControlledAsyncSelect name="leadSourceId"   control={control} label="Lead Source"          options={toOpts(srcs)}  />
      </FormSection>
      <FormSection title="Notes">
        <ControlledInput name="description" control={control} label="Notes" multiline rows={3} />
      </FormSection>
    </FormDrawer>
  )
}
