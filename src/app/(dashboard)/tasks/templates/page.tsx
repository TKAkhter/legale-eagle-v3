import { useEffect, useState } from "react"
import { Alert, Box, Button, IconButton } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useNavigate } from "react-router-dom"
import { useForm, useFieldArray } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { tasksApi } from "@/api/tasks"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

type TemplateForm = {
  templateTitle: string
  taskList: { title: string; priority: string; order: number }[]
}

const PRIORITIES = [
  { value: "0", label: "Low" },
  { value: "1", label: "Normal" },
  { value: "2", label: "High" },
]

function CreateTemplateDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: (id: string) => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<TemplateForm>({
    defaultValues: {
      templateTitle: "",
      taskList: [{ title: "", priority: "1", order: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "taskList" })

  useEffect(() => {
    if (!open) reset({ templateTitle: "", taskList: [{ title: "", priority: "1", order: 0 }] })
  }, [open, reset])

  async function onSubmit(data: TemplateForm) {
    setSubmitError(null)
    if (!data.templateTitle.trim()) { setSubmitError("Template title is required"); return }
    if (!data.taskList.length || data.taskList.some(t => !t.title.trim())) {
      setSubmitError("Each task needs a title")
      return
    }
    try {
      const res = await tasksApi.createTemplate({
        templateTitle: data.templateTitle.trim(),
        taskList: data.taskList.map((t, i) => ({
          title: t.title.trim(),
          priority: t.priority,
          order: i,
        })),
      }) as { taskUUId?: string; id?: string }
      toast.success("Template created")
      onSuccess?.(String(res?.taskUUId ?? res?.id ?? ""))
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to create template"
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="New Task Template"
      subtitle="Define a reusable checklist of tasks"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Create Template"
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Template">
        <ControlledInput name="templateTitle" control={control} label="Template Title" required />
      </FormSection>
      <FormSection title="Tasks">
        {fields.map((field, index) => (
          <Box key={field.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <ControlledInput name={`taskList.${index}.title`} control={control} label={`Task ${index + 1}`} required />
            </Box>
            <Box sx={{ width: 140 }}>
              <ControlledSelect
                name={`taskList.${index}.priority`}
                control={control}
                label="Priority"
                options={PRIORITIES}
              />
            </Box>
            <IconButton
              size="small"
              disabled={fields.length <= 1}
              onClick={() => remove(index)}
              sx={{ mt: 1 }}
              aria-label="Remove task"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ title: "", priority: "1", order: fields.length })}
        >
          Add Task
        </Button>
      </FormSection>
    </FormDrawer>
  )
}

export default function TaskTemplatesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)

  // Prefetch for FAB / assign drawer cache warmth
  useQuery({
    queryKey: ["task-templates", "parent"],
    queryFn: () => tasksApi.getTemplateParents(),
  })

  return (
    <PageShell
      title="Task Templates"
      description="Reusable task checklists for matters and clients"
      breadcrumbs={[{ label: "Tasks", path: "/tasks" }, { label: "Templates" }]}
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Template
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "templateTitle", header: "Title" },
          { field: "taskCreatedByName", header: "Created By", renderCell: v => String(v ?? "—") },
          {
            field: "taskUUId",
            header: "",
            renderCell: (_v, row) => (
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`/tasks/templates/${String((row as { taskUUId?: string; id?: string }).taskUUId ?? (row as { id?: string }).id)}`)}
              >
                Details
              </Button>
            ),
          },
        ]}
        queryKey={["task-templates", "list"]}
        queryFn={async (_p: GridParams) => {
          const list = await tasksApi.getTemplateParents()
          const content = (list as Record<string, unknown>[]).map(t => ({
            ...t,
            id: String(t.taskUUId ?? t.id),
          }))
          return {
            content,
            totalElements: content.length,
            totalPages: 1,
            number: 0,
            size: content.length,
            first: true,
            last: true,
            empty: content.length === 0,
          }
        }}
        isPaginated={false}
        zebraStriping
        detailPath={(row) => `/tasks/templates/${String((row as { taskUUId?: string; id?: string }).taskUUId ?? (row as { id?: string }).id ?? "")}`}
      />
      <CreateTemplateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(id) => {
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["task-templates"] })
          if (id) navigate(`/tasks/templates/${id}`)
        }}
      />
    </PageShell>
  )
}
