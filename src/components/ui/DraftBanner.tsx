/**
 * DraftBanner.tsx — shown at the top of a form when an unsaved draft exists.
 *
 * Usage:
 *   {hasDraft && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
 */
import { Alert, Button, Box } from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'

interface Props {
  onRestore: () => void
  onDiscard: () => void
}

export function DraftBanner({ onRestore, onDiscard }: Props) {
  return (
    <Alert
      severity="info"
      icon={<HistoryIcon fontSize="small" />}
      sx={{ mb: 2, py: 0.75 }}
      action={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" color="inherit" onClick={onDiscard}>Discard</Button>
          <Button size="small" variant="outlined" color="inherit" onClick={onRestore}>Restore</Button>
        </Box>
      }
    >
      You have an unsaved draft for this form.
    </Alert>
  )
}
