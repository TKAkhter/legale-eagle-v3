import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { teamsApi } from "@/api/teams"

type FormValues = { user: string; supervisor: string }

interface Props {
  open: boolean
  onClose: () => void
  teamId: string
  onSuccess?: () => void
}

function labelOf(u: Record<string, unknown>) {
  return (
    String(u.fullName ?? "")
    || `${String(u.firstName ?? "")} ${String(u.lastName ?? "")}`.trim()
    || String(u.name ?? u.email ?? u.id)
  )
}

export function AddMemberDrawer({ open, onClose, teamId, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { user: "", supervisor: "" },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["teams", "non-members", teamId],
    queryFn: () => teamsApi.getNonMembers(teamId),
    enabled: open && !!teamId,
  })

  const supervisorOpts = useMemo(
    () => (data?.members ?? []).map(u => ({ value: String(u.id), label: labelOf(u) })),
    [data],
  )
  const userOpts = useMemo(
    () => (data?.nonMembers ?? []).map(u => ({ value: String(u.id), label: labelOf(u) })),
    [data],
  )

  useEffect(() => {
    if (!open) reset()
    else reset({ user: "", supervisor: "" })
  }, [open, reset])

  async function onSubmit(form: FormValues) {
    setSubmitError(null)
    if (!form.user || !form.supervisor) {
      setSubmitError("Select both supervisor and user")
      return
    }
    try {
      await teamsApi.addMember({ team: teamId, user: form.user, supervisor: form.supervisor })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to add member",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Member"
      subtitle="Assign a user under a supervisor in this team"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting || isLoading}
      submitLabel="Add Member"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Assignment">
        <ControlledAsyncSelect name="supervisor" control={control} label="Supervisor *" options={supervisorOpts} required />
        <ControlledAsyncSelect name="user" control={control} label="User *" options={userOpts} required />
      </FormSection>
    </FormDrawer>
  )
}
