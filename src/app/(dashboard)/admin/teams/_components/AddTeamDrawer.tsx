import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { adminApi } from "@/api/admin"
import { teamsApi } from "@/api/teams"

type FormValues = { name: string; hod: string }

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddTeamDrawer({ open, onClose, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: "", hod: "" },
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min", "add-team"],
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })

  const userOpts = useMemo(() => {
    const list = (Array.isArray(users) ? users : []) as Record<string, unknown>[]
    return list
      .filter(u => u.isActive !== false && u.active !== false && !u.loginDisabled)
      .map(u => ({
        value: String(u.id),
        label:
          String(u.fullName ?? "")
          || `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim()
          || String(u.email ?? u.id),
      }))
  }, [users])

  useEffect(() => {
    if (!open) reset()
    else reset({ name: "", hod: "" })
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    if (!data.name.trim()) {
      setSubmitError("Team name is required")
      return
    }
    if (!data.hod) {
      setSubmitError("HOD is required")
      return
    }
    try {
      await teamsApi.createTeam({ name: data.name.trim(), hod: data.hod })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to create team",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Team"
      subtitle="Create a team with a head of department"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Create"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Team">
        <ControlledInput name="name" control={control} label="Team Name" required />
        <ControlledAsyncSelect name="hod" control={control} label="HOD *" options={userOpts} required />
      </FormSection>
    </FormDrawer>
  )
}
