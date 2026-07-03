import { Drawer, Box, Typography, IconButton, Divider, Button, CircularProgress } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel?: string
  width?: number | string
  children: React.ReactNode
}

/**
 * FormDrawer — slide-in panel for create/edit forms.
 * Preferred over Modal for forms with >4 fields — gives more vertical space
 * and keeps the list visible behind the form for context.
 */
export function FormDrawer({
  open, onClose, title, subtitle, onSubmit, isSubmitting, submitLabel = 'Save', width = 520, children
}: Props) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ mt: 0.5 }}><CloseIcon /></IconButton>
      </Box>
      <Divider />

      {/* Scrollable form body */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
        {children}
      </Box>

      {/* Sticky footer */}
      <Divider />
      <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexShrink: 0 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={isSubmitting} sx={{ minWidth: 100 }}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : submitLabel}
        </Button>
      </Box>
    </Drawer>
  )
}
