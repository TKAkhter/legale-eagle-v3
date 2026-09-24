/**
 * Matter Projected Hours tab — list + add/edit (LMS ProjectedHoursTab).
 */
import { useMemo, useState } from "react"
import { Box, Button, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { mattersApi } from "@/api/matters"
import { ProjectedHoursDrawer } from "./ProjectedHoursDrawer"
import type { GridParams } from "@/types/common.types"

interface Props {
  matterId: string
  canEdit?: boolean
}

export function MatterProjectedHoursTab({ matterId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [updateMode, setUpdateMode] = useState(false)
  const [gridKey, setGridKey] = useState(0)

  const previewQ = useQuery({
    queryKey: ["matters", "projected-hours", "preview", matterId],
    queryFn: () => mattersApi.getProjectedHours(matterId, { page: 0, pageSize: 100, sortBy: "", sortDir: "asc" }),
    enabled: !!matterId,
  })

  const existing = useMemo(() => {
    const content = (previewQ.data?.content ?? []) as Record<string, unknown>[]
    return content
      .filter(r => String(r.designationId ?? "") || Number(r.projectedHours ?? r.hours ?? 0) > 0)
      .map(r => ({
        designationId: String(r.designationId ?? ""),
        designationName: String(r.designation ?? r.designationName ?? ""),
        hours: Number(r.projectedHours ?? r.hours ?? 0),
        templateId: String(r.templateId ?? ""),
      }))
  }, [previewQ.data])

  const hasExisting = existing.some(r => r.designationId && r.hours > 0)
  const templateId = existing.find(r => r.templateId)?.templateId ?? ""

  function openAdd() {
    setUpdateMode(false)
    setDrawerOpen(true)
  }
  function openEdit() {
    setUpdateMode(true)
    setDrawerOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          Estimated hours by designation (SOW)
        </Typography>
        {canEdit && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {hasExisting ? (
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={openEdit}>
                Edit
              </Button>
            ) : (
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                Add from Template
              </Button>
            )}
            {hasExisting && (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
                Re-apply Template
              </Button>
            )}
          </Box>
        )}
      </Box>

      <DataGrid
        key={gridKey}
        columns={[
          { field: "designation", header: "Designation" },
          { field: "projectedHours", header: "Projected Hours", align: "right" },
          { field: "usedHours", header: "Used Hours", align: "right" },
          { field: "balanceHours", header: "Balance", align: "right" },
          { field: "usagePercent", header: "Usage %", align: "right", renderCell: v => `${Number(v ?? 0)}%` },
        ]}
        queryKey={["matters", "projected-hours", matterId]}
        queryFn={(p: GridParams) => mattersApi.getProjectedHours(matterId, p)}
      />

      <ProjectedHoursDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        matterId={matterId}
        updateMode={updateMode}
        initialRows={updateMode
          ? existing.map(r => ({
              designationId: r.designationId,
              designationName: r.designationName,
              hours: r.hours,
            }))
          : []}
        initialTemplateId={updateMode ? templateId : ""}
        onSuccess={() => {
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["matters", "projected-hours", matterId] })
          qc.invalidateQueries({ queryKey: ["matters", "projected-hours", "preview", matterId] })
        }}
      />
    </Box>
  )
}
