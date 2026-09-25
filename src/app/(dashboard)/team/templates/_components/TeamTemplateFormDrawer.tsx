import { useEffect, useMemo, useState } from "react"
import { Alert, Box, Button, IconButton } from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import { useFieldArray, useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { teamTemplatesApi } from "@/api/teamTemplates"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

type Member = { userId: string; teamRoleId: string }
type Form = { name: string; description: string; users: Member[] }

interface Props {
  open: boolean
  onClose: () => void
  templateId?: string
  onSuccess?: () => void
}

export function TeamTemplateFormDrawer({ open, onClose, templateId, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { name: "", description: "", users: [{ userId: "", teamRoleId: "" }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "users" })

  const { data: roles = [] } = useQuery({
    queryKey: ["team-roles", "all"],
    queryFn: () => teamTemplatesApi.getRoles(),
    enabled: open,
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min", "team-template"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "u1", firstName: "Sarah", lastName: "Johnson" }]
      const r = await axiosClient.get("/api/user/get/min")
      return r.data?.data ?? r.data ?? []
    },
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      reset({ name: "", description: "", users: [{ userId: "", teamRoleId: "" }] })
      return
    }
    if (!templateId) return
    teamTemplatesApi.getById(templateId).then(t => {
      const row = t as Record<string, unknown>
      const members = ((row.users ?? []) as Record<string, string>[]).map(m => ({
        userId: String(m.userId ?? m.id ?? ""),
        teamRoleId: String(m.teamRoleId ?? ""),
      }))
      reset({
        name: String(row.name ?? ""),
        description: String(row.description ?? ""),
        users: members.length ? members : [{ userId: "", teamRoleId: "" }],
      })
    }).catch(() => undefined)
  }, [open, templateId, reset])

  const roleOpts = useMemo(
    () => (roles as Record<string, string>[]).map(r => ({
      value: String(r.id),
      label: String(r.name ?? r.roleName ?? r.id),
    })),
    [roles],
  )
  const userOpts = useMemo(
    () => (users as Record<string, string>[]).map(u => ({
      value: u.id,
      label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id,
    })),
    [users],
  )

  async function onSubmit(data: Form) {
    setSubmitError(null)
    if (!data.name.trim()) { setSubmitError("Name is required"); return }
    const usersPayload = data.users.filter(u => u.userId && u.teamRoleId)
    if (!usersPayload.length) { setSubmitError("Add at least one member with a role"); return }
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim(),
        users: usersPayload,
      }
      if (templateId) toast.success(await teamTemplatesApi.update(templateId, payload))
      else toast.success(await teamTemplatesApi.create(payload))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError((e as { message?: string })?.message ?? "Failed to save template")
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={templateId ? "Edit Team Template" : "New Team Template"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={templateId ? "Update" : "Create"}
      width={560}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Template">
        <ControlledInput name="name" control={control} label="Name" required />
        <ControlledInput name="description" control={control} label="Description" multiline rows={2} />
      </FormSection>
      <FormSection title="Members">
        {fields.map((field, index) => (
          <Box key={field.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <ControlledAsyncSelect name={`users.${index}.userId`} control={control} label="User" options={userOpts} required />
            </Box>
            <Box sx={{ flex: 1 }}>
              <ControlledSelect name={`users.${index}.teamRoleId`} control={control} label="Role" options={roleOpts} required />
            </Box>
            <IconButton size="small" onClick={() => remove(index)} disabled={fields.length === 1} sx={{ mt: 1 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button size="small" onClick={() => append({ userId: "", teamRoleId: "" })}>Add member</Button>
      </FormSection>
    </FormDrawer>
  )
}
