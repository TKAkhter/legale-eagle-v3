import { useState } from "react"
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { formatCurrency } from "@lib/utils/formatCurrency"

interface Props {
  matterId: string
  subMatters?: Record<string, unknown>[]
}

/** Sub-matters / SOW list with quick add (LMS SubMatterGrid parity — list + add). */
export function SubMattersPanel({ matterId, subMatters = [] }: Props) {
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [estimate, setEstimate] = useState("")
  const [adding, setAdding] = useState(false)

  const addMut = useMutation({
    mutationFn: async () => {
      if (env.USE_STATIC_DATA) {
        await new Promise(r => setTimeout(r, 250))
        return
      }
      await axiosClient.post("/api/matter/add-sub-matter", {
        matterId,
        title,
        estimate: Number(estimate) || 0,
      })
    },
    onSuccess: () => {
      setTitle("")
      setEstimate("")
      setAdding(false)
      qc.invalidateQueries({ queryKey: ["matters", "detail", matterId] })
      toast.success("Sub-matter added")
    },
    onError: () => toast.error("Failed to add sub-matter"),
  })

  const rows = subMatters.length
    ? subMatters
    : env.USE_STATIC_DATA
      ? [{ id: "sm1", title: "SOW1 — Pleadings", estimate: 10000, status: "OPEN" }]
      : []

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sub-Matters / Scope</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(v => !v)}>
          {adding ? "Cancel" : "Add"}
        </Button>
      </Box>
      {adding && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <TextField size="small" label="Title" value={title} onChange={e => setTitle(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          <TextField size="small" label="Estimate" type="number" value={estimate} onChange={e => setEstimate(e.target.value)} sx={{ width: 120 }} />
          <Button size="small" variant="contained" disabled={!title.trim() || addMut.isPending} onClick={() => addMut.mutate()}>Save</Button>
        </Box>
      )}
      {!rows.length && <Typography variant="body2" color="text.secondary">No sub-matters</Typography>}
      {rows.map((row, i) => (
        <Box key={String(row.id ?? i)} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(row.title ?? row.sowNumber ?? `SOW ${i + 1}`)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {row.estimate != null ? formatCurrency(Number(row.estimate)) : "—"}
            {row.status ? ` · ${String(row.status)}` : ""}
          </Typography>
        </Box>
      ))}
      {addMut.isError && <Alert severity="error" sx={{ mt: 1 }}>Could not add sub-matter</Alert>}
    </Paper>
  )
}
