import { env } from '@/config/env'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, Alert, Button, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { FormDrawer } from '@components/ui/FormDrawer'
import { FormSection } from '@components/forms/FormSection'
import { ControlledInput } from '@components/forms/ControlledInput'
import { ControlledDatePicker } from '@components/forms/ControlledDatePicker'
import { ControlledCheckbox } from '@components/forms/ControlledCheckbox'
import { ControlledAsyncSelect } from '@components/forms/ControlledAsyncSelect'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@lib/query/keys'
import { adminApi } from '@/api/admin'
import { leadsApi } from '@/api/leads'

const schema = z.object({
  followUpContent:  z.string().min(1, 'Notes required'),
  followUpTime:     z.string().min(1, 'Date required'),
  nextFollowUpTime: z.string().optional(),
  assignToId:       z.string().optional(),
  departmentId:     z.string().optional(),
  stageCompleted:   z.boolean(),
})
type Form = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void; leadId: string; onSuccess?: () => void }

export function FollowupFormDrawer({ open, onClose, leadId, onSuccess }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitError, setSubmitError] = useState<string|null>(null)
  const { control, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { stageCompleted: false, followUpTime: new Date().toISOString().slice(0,10) },
  })
  const assignToId = watch("assignToId")

  useEffect(() => { if (!open) { reset(); setFiles([]); setSubmitError(null) } }, [open, reset])

  const { data: users = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: () => adminApi.getUsersMin(),
    enabled: open,
  })
  const { data: departments = [] } = useQuery({
    queryKey: QK.lookups.departments(),
    queryFn: () => adminApi.getDepartments(),
    enabled: open,
  })

  const userOpts = (users as { id?: string; firstName?: string; lastName?: string; department?: { id?: string } }[]).map(u => ({
    value: String(u.id ?? ""),
    label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || String(u.id),
  }))
  const deptOpts = (departments as { id?: string; name?: string }[]).map(d => ({
    value: String(d.id ?? ""),
    label: String(d.name ?? d.id),
  }))

  useEffect(() => {
    if (!assignToId) return
    const u = (users as { id?: string; department?: { id?: string } }[]).find(x => String(x.id) === assignToId)
    if (u?.department?.id) setValue("departmentId", String(u.department.id))
  }, [assignToId, users, setValue])

  async function onSubmit(data: Form) {
    setSubmitError(null)
    try {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 400))
      } else {
        const form = new FormData()
        form.append("content", data.followUpContent)
        form.append("followUpTime", data.followUpTime)
        form.append("nextFollowUpTime", data.nextFollowUpTime ?? "")
        form.append("assignTo", data.assignToId ?? "")
        form.append("department", data.departmentId ?? "")
        form.append("stageCompleted", String(data.stageCompleted))
        if (files.length) files.forEach(f => form.append("files", f))
        else form.append("files", "")
        await leadsApi.addFollowup(leadId, form)
      }
      qc.invalidateQueries({ queryKey: ['leads','followups', leadId] })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Add Follow-up"
      subtitle="Record activity or schedule the next follow-up"
      onSubmit={handleSubmit(onSubmit)} isSubmitting={isSubmitting}
      submitLabel="Save Follow-up" width={480}>
      {submitError && <Alert severity="error" sx={{ mb:2 }} onClose={()=>setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Follow-up Details">
        <ControlledInput name="followUpContent" control={control} label="Notes *" multiline rows={4} required />
        <ControlledDatePicker name="followUpTime"     control={control} label="Follow-up Date *" required />
        <ControlledDatePicker name="nextFollowUpTime" control={control} label="Next Follow-up Date" />
        <ControlledAsyncSelect name="assignToId" control={control} label="Assign To" options={userOpts} />
        <ControlledAsyncSelect name="departmentId" control={control} label="Department" options={deptOpts} />
        <ControlledCheckbox name="stageCompleted" control={control} label="This stage is complete" />
        <Box>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
          />
          <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()}>
            Attach files
          </Button>
          {!!files.length && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {files.map(f => f.name).join(", ")}
            </Typography>
          )}
        </Box>
      </FormSection>
    </FormDrawer>
  )
}
