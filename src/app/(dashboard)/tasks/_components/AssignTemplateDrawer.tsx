import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Alert, Box, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { tasksApi } from "@/api/tasks"
import { toast } from "@/lib/toast"
import { unwrapAxiosList } from "@lib/utils/unwrap"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Form = {
  templateId: string
  taskType: string
  clientId: string
  matterId: string
  assignPersonId: string
  approvalPersonId: string
}

export function AssignTemplateDrawer({ open, onClose, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: {
      templateId: "",
      taskType: "MATTER",
      clientId: "",
      matterId: "",
      assignPersonId: "",
      approvalPersonId: "",
    },
  })

  const taskType = watch("taskType")
  const clientId = watch("clientId")
  const templateId = watch("templateId")

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates", "parent"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ taskUUId: "tpl1", id: "tpl1", templateTitle: "Matter Kickoff Template" }]
      }
      const r = await axiosClient.get("/api/task/get/template/parent")
      return r.data?.data ?? r.data ?? []
    },
    enabled: open,
  })

  const { data: templateTasks = [] } = useQuery({
    queryKey: ["task-templates", "full", templateId],
    queryFn: async () => {
      if (!templateId) return []
      if (env.USE_STATIC_DATA) {
        return [
          { title: "Conflict check", priority: "High" },
          { title: "Open matter checklist", priority: "Normal" },
        ]
      }
      const r = await axiosClient.get("/api/task/get/template/full", { params: { taskUUId: templateId } })
      const d = r.data?.data ?? r.data
      return Array.isArray(d) ? d : []
    },
    enabled: open && !!templateId,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "mini", "assign-template"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "c1", companyName: "Al Rashid Holdings" }]
      }
      const r = await axiosClient.get("/api/client/get/short-info", { params: { pageNumber: 0, pageSize: 100 } })
      return unwrapAxiosList(r.data)
    },
    enabled: open,
  })

  const { data: matters = [] } = useQuery({
    queryKey: ["matters", "by-client", clientId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "m1", matterId: "m1", title: "260303 — Building Dispute" }]
      }
      if (!clientId) {
        const r = await axiosClient.get("/api/matter/get/short-info", { params: { pageNumber: 0, pageSize: 100 } })
        return unwrapAxiosList(r.data)
      }
      const r = await axiosClient.get("/api/matter/mini/by/client", { params: { clientId } })
      return r.data?.data ?? r.data ?? []
    },
    enabled: open && taskType === "MATTER",
  })

  const { data: users = [] } = useQuery({
    queryKey: ["users", "min", "assign-template"],
    queryFn: async () => {
      const r = await axiosClient.get("/api/user/get/min")
      return r.data?.data ?? r.data ?? []
    },
    enabled: open,
  })

  const templateOpts = useMemo(
    () => (templates as Record<string, string>[]).map(t => ({
      value: String(t.taskUUId ?? t.id),
      label: String(t.templateTitle ?? t.title ?? t.id),
    })),
    [templates],
  )
  const clientOpts = useMemo(
    () => (clients as Record<string, string>[]).map(c => ({
      value: c.id,
      label: (c as { clientName?: string }).clientName
        ?? c.companyName
        ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
    })),
    [clients],
  )
  const matterOpts = useMemo(
    () => (matters as Record<string, string>[]).map(m => ({
      value: String(m.matterId ?? m.id),
      label: String(m.title ?? m.matterId ?? m.id),
    })),
    [matters],
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
    try {
      if (!data.templateId) { setSubmitError("Select a template"); return }
      if (!data.assignPersonId) { setSubmitError("Select assignee"); return }
      if (data.taskType === "MATTER" && !data.matterId) { setSubmitError("Select a matter"); return }
      if (data.taskType === "CLIENT" && !data.clientId) { setSubmitError("Select a client"); return }

      const typeId = data.taskType === "CLIENT" ? data.clientId : data.matterId
      const list = (templateTasks as Record<string, unknown>[])
      if (!list.length) { setSubmitError("Template has no tasks"); return }

      for (const item of list) {
        await tasksApi.create({
          title: String(item.title ?? item.taskName ?? "Template task"),
          taskName: String(item.title ?? item.taskName ?? "Template task"),
          priority: String(item.priority ?? "Normal"),
          taskType: data.taskType,
          taskTypeId: typeId,
          assignTask: true,
          assignPerson: data.assignPersonId,
          approval: !!data.approvalPersonId,
          approvalType: data.approvalPersonId ? "After" : "",
          afterTaskApprovalPerson: data.approvalPersonId || "",
          afterTaskApproval: !!data.approvalPersonId,
          taskApprovalType: "SingleLevel",
          subTask: false,
          subTasks: [],
        })
      }

      toast.success(`Assigned ${list.length} task${list.length === 1 ? "" : "s"} from template`)
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to assign template",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Assign Task Template"
      subtitle="Create tasks from a saved template"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Assign"
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormSection title="Template">
        <ControlledSelect name="templateId" control={control} label="Template" options={templateOpts} required />
        {templateId && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {(templateTasks as unknown[]).length} task{(templateTasks as unknown[]).length === 1 ? "" : "s"} in template
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, mt: 0.5 }}>
              {(templateTasks as Record<string, unknown>[]).slice(0, 8).map((t, i) => (
                <Typography key={i} component="li" variant="body2">{String(t.title ?? t.taskName ?? "—")}</Typography>
              ))}
            </Box>
          </Box>
        )}
      </FormSection>

      <FormSection title="Assign To">
        <ControlledSelect
          name="taskType"
          control={control}
          label="Related To"
          options={[
            { value: "MATTER", label: "Matter" },
            { value: "CLIENT", label: "Client" },
          ]}
          required
        />
        {taskType === "CLIENT" && (
          <ControlledAsyncSelect name="clientId" control={control} label="Client" options={clientOpts} required />
        )}
        {taskType === "MATTER" && (
          <>
            <ControlledAsyncSelect name="clientId" control={control} label="Client (optional filter)" options={clientOpts} />
            <ControlledAsyncSelect name="matterId" control={control} label="Matter" options={matterOpts} required />
          </>
        )}
        <ControlledAsyncSelect name="assignPersonId" control={control} label="Assignee" options={userOpts} required />
        <ControlledAsyncSelect name="approvalPersonId" control={control} label="Approver (optional)" options={userOpts} />
      </FormSection>
    </FormDrawer>
  )
}
