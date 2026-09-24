import { useState } from "react"
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

export default function TranslationCourierPage() {
  const [type, setType] = useState("Transactional")
  const [description, setDescription] = useState("")
  const [pages, setPages] = useState("1")
  const [rate, setRate] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!description.trim()) {
      toast.error("Description is required")
      return
    }
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/invoice/translation-courier", {
          type,
          description,
          page: Number(pages) || 1,
          rate: Number(rate) || 0,
          issueDate,
          dueDate,
        })
      }
      toast.success("Translation / courier invoice created")
      setDescription("")
      setRate("")
    } catch {
      toast.error("Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Translation / Courier" description="Create translation or courier billing invoices">
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 640 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>New invoice</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField select label="Type" size="small" value={type} onChange={e => setType(e.target.value)}>
            <MenuItem value="Transactional">Transactional</MenuItem>
            <MenuItem value="Courier">Courier</MenuItem>
          </TextField>
          <TextField label="Description" size="small" multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} />
          {type === "Transactional" && (
            <>
              <TextField label="Pages" size="small" type="number" value={pages} onChange={e => setPages(e.target.value)} />
              <TextField label="Rate" size="small" type="number" value={rate} onChange={e => setRate(e.target.value)} />
            </>
          )}
          <TextField label="Issue Date" size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          <TextField label="Due Date" size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Button variant="contained" disabled={saving} onClick={submit}>Create</Button>
        </Box>
      </Paper>
    </PageShell>
  )
}
