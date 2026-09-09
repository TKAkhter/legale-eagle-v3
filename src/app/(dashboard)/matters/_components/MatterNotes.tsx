/**
 * MatterNotes.tsx — rich text notes tab for a matter.
 *
 * Auto-saves 1.5s after last keystroke.
 * Static mode: saves to localStorage keyed by matterId.
 * Live mode:   PUT /api/matter/notes { matterId, notes }
 */
import { useState, useEffect } from "react"
import { Box, Typography, Chip } from "@mui/material"
import CheckIcon from "@mui/icons-material/Check"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { logger } from "@/lib/logger"

interface Props { matterId: string; initialNotes?: string }

const SAVE_KEY = (id: string) => `matter-notes-${id}`

export function MatterNotes({ matterId, initialNotes = "" }: Props) {
  const [notes,   setNotes]   = useState(() => {
    if (env.USE_STATIC_DATA) return localStorage.getItem(SAVE_KEY(matterId)) ?? initialNotes
    return initialNotes
  })
  const [status, setStatus] = useState<"idle"|"saving"|"saved">("idle")

  useEffect(() => {
    if (!env.USE_STATIC_DATA && initialNotes && initialNotes !== notes) setNotes(initialNotes)
  }, [initialNotes]) // eslint-disable-line

  async function handleSave(html: string) {
    setStatus("saving")
    logger.debug("MatterNotes", `Saving notes for matter ${matterId}`)
    try {
      if (env.USE_STATIC_DATA) {
        localStorage.setItem(SAVE_KEY(matterId), html)
      } else {
        await axiosClient.put("/api/matter/notes", { matterId, notes: html })
      }
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("idle")
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Matter Notes</Typography>
        {status === "saved" && (
          <Chip icon={<CheckIcon sx={{ fontSize: 14 }} />} label="Saved" size="small" color="success" variant="outlined" />
        )}
        {status === "saving" && (
          <Typography variant="caption" color="text.disabled">Saving…</Typography>
        )}
      </Box>
      <RichTextEditor
        value={notes}
        onChange={setNotes}
        onSave={handleSave}
        autoSave
        placeholder="Add notes about this matter — strategy, client preferences, key dates…"
        minHeight={240}
      />
    </Box>
  )
}
