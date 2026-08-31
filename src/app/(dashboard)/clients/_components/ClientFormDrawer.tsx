import { z } from "zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { ControlledInput, ControlledSelect, FormSection } from "@components/forms"
import { clientsApi } from "@/api/clients"

const schema = z.object({
  firstName:    z.string().min(1, "Required"),
  lastName:     z.string().optional(),
  companyName:  z.string().optional(),
  clientType:   z.enum(["COMPANY","PERSON"]),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  phone:        z.string().optional(),
  trnNo:        z.string().optional(),
})
type ClientForm = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; clientId?: string; onSaved: () => void }

export function ClientFormDrawer({ open, onClose, clientId, onSaved }: Props) {
  const isEdit = !!clientId
  const [error, setError] = useState("")

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<ClientForm>({
    resolver: zodResolver(schema),
    defaultValues: { clientType: "PERSON" },
  })

  const { data: existing } = useQuery({
    queryKey: ["clients","detail",clientId],
    queryFn: () => clientsApi.getById(clientId!),
    enabled: !!clientId && open,
  })

  useEffect(() => { if (!open) { reset({ clientType: "PERSON" }); setError("") } }, [open, reset])

  useEffect(() => {
    if (existing && isEdit) {
      const e = existing as Record<string,unknown>
      reset({
        firstName: String(e.firstName??""), lastName: String(e.lastName??""),
        companyName: String(e.companyName??""), clientType: (e.clientType as "PERSON"|"COMPANY") ?? "PERSON",
        email: (e.email as {emailId:string}[])?.[0]?.emailId ?? String(e.email??""),
        phone: (e.phones as {phoneNo:string}[])?.[0]?.phoneNo ?? String(e.phone??""),
        trnNo: String(e.trnNo??""),
      })
    }
  }, [existing, isEdit, reset])

  async function onSubmit(vals: ClientForm) {
    setError("")
    try {
      const payload = {
        ...vals,
        email:  vals.email ? [{ emailId: vals.email, type: "Work", primary: true }] : [],
        phones: vals.phone ? [{ phoneNo: vals.phone, type: "Mobile", codeNo: "+971", primary: true }] : [],
      }
      if (isEdit) await clientsApi.update(clientId!, payload as Record<string,unknown>)
      else        await clientsApi.create(payload as Record<string,unknown>)
      onSaved()
    } catch (e: unknown) {
      setError((e as {response?:{data?:{message?:string}}})?.response?.data?.message ?? "Something went wrong")
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEdit ? "Edit Client" : "New Client"}
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting} submitLabel={isEdit ? "Update" : "Create Client"}>
      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}
      <FormSection title="Basic Info">
        <ControlledSelect name="clientType" control={control} label="Client Type"
          options={[{value:"PERSON",label:"Individual"},{value:"COMPANY",label:"Company"}]} />
        <ControlledInput name="firstName"   control={control} label="First Name"    required />
        <ControlledInput name="lastName"    control={control} label="Last Name" />
        <ControlledInput name="companyName" control={control} label="Company Name" />
        <ControlledInput name="trnNo"       control={control} label="TRN / VAT Number" />
      </FormSection>
      <FormSection title="Contact">
        <ControlledInput name="email" control={control} label="Email" type="email" />
        <ControlledInput name="phone" control={control} label="Phone" />
      </FormSection>
    </FormDrawer>
  )
}
