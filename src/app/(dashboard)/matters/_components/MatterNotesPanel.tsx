import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { mattersApi } from "@/api/matters"
import { formatDateTime } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { MatterNotes } from "./MatterNotes"

interface Props { matterId: string; canEdit?: boolean }

export function MatterNotesPanel({ matterId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const notesQuery = useQuery({
    queryKey: ["matters", "notes", matterId],
    queryFn: () => mattersApi.getNotes(matterId, { page: 0, pageSize: 50 }),
  })

  const addNote = useMutation({
    mutationFn: () => mattersApi.addNote(matterId, { title, content }),
    onSuccess: () => {
      toast.success("Note added")
      setOpen(false)
      setTitle("")
      setContent("")
      qc.invalidateQueries({ queryKey: ["matters", "notes", matterId] })
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? "Failed to add note"),
  })

  const notes = notesQuery.data?.content ?? []

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notes</Typography>
        {canEdit && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Note
          </Button>
        )}
      </Box>

      {notes.map(note => (
        <Paper key={String(note.id)} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{String(note.title ?? "Note")}</Typography>
          <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
            {String(note.textContent ?? note.content ?? "")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {String(note.createdBy ?? "")} · {formatDateTime(String(note.createdAt ?? ""))}
          </Typography>
        </Paper>
      ))}
      {!notes.length && <Typography variant="body2" color="text.secondary">No notes yet</Typography>}

      <MatterNotes matterId={matterId} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth />
          <TextField label="Content" value={content} onChange={e => setContent(e.target.value)} fullWidth multiline rows={5} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || !content.trim() || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
