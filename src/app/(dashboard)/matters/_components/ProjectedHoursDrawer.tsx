/**
 * Matter projected hours — LMS ProjectedHoursTab add/update from template.
 */
import { useEffect, useState } from "react"
import {
  Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

interface EstRow {
  designationId: string
  designationName: string
  hours: number
}

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  /** When true, PUT update; otherwise POST add */
  updateMode?: boolean
  initialRows?: EstRow[]
  initialTemplateId?: string
  onSuccess?: () => void
}

export function ProjectedHoursDrawer({
  open, onClose, matterId, updateMode = false, initialRows = [], initialTemplateId = "", onSuccess,
}: Props) {
  const [templateId, setTemplateId] = useState("")
  const [rows, setRows] = useState<EstRow[]>([])
  const [originalRows, setOriginalRows] = useState<EstRow[]>([])
  const [saving, setSaving] = useState(false)
  const [addDesigId, setAddDesigId] = useState("")
  const [addHours, setAddHours] = useState("")

  const templatesQ = useQuery({
    queryKey: ["estimate-hours-templates", "matter"],
    enabled: open,
    queryFn: () => mattersApi.getEstimateHourTemplates(),
  })
  const designationsQ = useQuery({
    queryKey: ["designations", "projected-hours"],
    enabled: open,
    queryFn: () => adminApi.getDesignations(),
  })

  useEffect(() => {
    if (!open) return
    setTemplateId(initialTemplateId)
    const seeded = initialRows.map(r => ({ ...r }))
    setRows(seeded.length ? seeded : [])
    setOriginalRows(seeded)
    setAddDesigId("")
    setAddHours("")
  }, [open, initialTemplateId, initialRows])

  async function loadTemplate(id: string) {
    setTemplateId(id)
    if (!id) {
      setRows([])
      setOriginalRows([])
      return
    }
    try {
      const tpl = await mattersApi.getEstimateHourTemplateById(id)
      const details = (tpl.designationDetails ?? tpl.designationDetail ?? []) as Record<string, unknown>[]
      const designations = (designationsQ.data ?? []) as { id?: string; name?: string }[]
      const next = (Array.isArray(details) ? details : []).map(d => {
        const desigId = String(d.designationId ?? "")
        const des = designations.find(x => String(x.id) === desigId)
        return {
          designationId: desigId,
          designationName: String(des?.name ?? d.designationName ?? d.name ?? ""),
          hours: Number(d.hours ?? 0),
        }
      }).filter(r => r.designationId)
      setRows(next)
      setOriginalRows(next.map(r => ({ ...r })))
    } catch (e) {
      logger.error("ProjectedHoursDrawer", "Template load failed", e)
      toast.error("Failed to load template")
    }
  }

  function addRow() {
    if (!addDesigId) return
    const designations = (designationsQ.data ?? []) as { id?: string; name?: string }[]
    const des = designations.find(x => String(x.id) === addDesigId)
    const hours = Number(addHours) || 0
    if (hours <= 0) {
      toast.error("Hours must be greater than 0")
      return
    }
    if (rows.some(r => r.designationId === addDesigId)) {
      setRows(prev => prev.map(r => r.designationId === addDesigId ? { ...r, hours } : r))
    } else {
      setRows(prev => [
        ...prev,
        { designationId: addDesigId, designationName: String(des?.name ?? ""), hours },
      ])
    }
    setAddDesigId("")
    setAddHours("")
  }

  async function submit() {
    const designationEstimates = rows
      .filter(r => r.hours > 0 && r.designationId)
      .map(r => ({
        designationId: r.designationId,
        designationName: r.designationName,
        hours: Number(r.hours),
      }))
    if (!designationEstimates.length) {
      toast.error("Add at least one designation with hours")
      return
    }
    setSaving(true)
    try {
      if (updateMode) {
        await mattersApi.saveProjectedHours({
          matterId,
          designationEstimates,
          update: true,
        })
        toast.success("Projected hours updated")
      } else {
        const normalize = (list: EstRow[]) =>
          list
            .filter(r => r.hours > 0)
            .map(r => ({ designationId: String(r.designationId), hours: Number(r.hours) }))
            .sort((a, b) => a.designationId.localeCompare(b.designationId))
        let applyFromTemplate = false
        if (templateId && originalRows.length) {
          const cur = normalize(rows)
          const orig = normalize(originalRows)
          applyFromTemplate =
            cur.length === orig.length
            && cur.every((row, i) => row.designationId === orig[i].designationId && row.hours === orig[i].hours)
        }
        await mattersApi.saveProjectedHours({
          matterId,
          designationEstimates,
          templateId: templateId || undefined,
          applyFromTemplate,
        })
        toast.success("Projected hours saved")
      }
      onSuccess?.()
      onClose()
    } catch (e) {
      logger.error("ProjectedHoursDrawer", "Save failed", e)
      toast.error((e as Error)?.message ?? "Failed to save projected hours")
    } finally {
      setSaving(false)
    }
  }

  const templates = (templatesQ.data ?? []) as { id?: string; templateId?: string; templateName?: string; name?: string }[]
  const designations = (designationsQ.data ?? []) as { id?: string; name?: string; status?: boolean }[]
  const activeDesignations = designations.filter(d => d.status !== false)

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={updateMode ? "Edit Projected Hours" : "Add Projected Hours"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={updateMode ? "Update" : "Apply"}
      width={560}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {!updateMode && (
          <FormControl size="small" fullWidth>
            <InputLabel>Template</InputLabel>
            <Select
              label="Template"
              value={templateId}
              onChange={e => void loadTemplate(String(e.target.value))}
            >
              <MenuItem value=""><em>None / manual</em></MenuItem>
              {templates.map(t => {
                const id = String(t.id ?? t.templateId ?? "")
                return (
                  <MenuItem key={id} value={id}>{t.templateName || t.name || id}</MenuItem>
                )
              })}
            </Select>
          </FormControl>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Designation hours</Typography>
        {rows.map((row, idx) => (
          <Box key={row.designationId} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{row.designationName || row.designationId}</Typography>
            <TextField
              size="small"
              type="number"
              label="Hours"
              value={row.hours}
              onChange={e => {
                const hours = Number(e.target.value)
                setRows(prev => prev.map((r, i) => i === idx ? { ...r, hours } : r))
              }}
              sx={{ width: 120 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <IconButton
              size="small"
              onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
              aria-label="Remove"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        {!rows.length && (
          <Typography variant="body2" color="text.secondary">No designations yet — pick a template or add below.</Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Designation</InputLabel>
            <Select label="Designation" value={addDesigId} onChange={e => setAddDesigId(String(e.target.value))}>
              {activeDesignations.map(d => (
                <MenuItem key={String(d.id)} value={String(d.id)}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Hours"
            value={addHours}
            onChange={e => setAddHours(e.target.value)}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 0.5 }}>
            Add
          </Button>
        </Box>
      </Box>
    </FormDrawer>
  )
}
