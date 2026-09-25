import { Drawer, Box, Typography, IconButton, Divider, Button, CircularProgress, useMediaQuery } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel?: string
  /** When true, hides the primary submit button (read-only / blocked edits). */
  hideSubmit?: boolean
  width?: number | string
  children: React.ReactNode
}

/**
 * FormDrawer — slide-in panel for create/edit forms.
 * On mobile/tablet: full viewport width so it never overflows the screen.
 */
export function FormDrawer({
  open, onClose, title, subtitle, onSubmit, isSubmitting, submitLabel = 'Save', hideSubmit, width = 520, children
}: Props) {
  const isCompact = useMediaQuery('(max-width:899px)')
  const paperWidth = isCompact
    ? '100%'
    : `min(${typeof width === 'number' ? `${width}px` : width}, 100vw)`

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        zIndex: 1400, // above fixed Toolbar (1201) and sidebar (1300)
        '& .MuiBackdrop-root': { zIndex: 1399 },
        '& .MuiDrawer-paper': {
          width: paperWidth,
          maxWidth: '100vw',
          height: '100%',
          maxHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          zIndex: 1400,
        },
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ mt: 0.5, flexShrink: 0 }}><CloseIcon /></IconButton>
      </Box>
      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, sm: 3 }, py: 2.5, minWidth: 0 }}>
        {children}
      </Box>

      <Divider />
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={isSubmitting}>{hideSubmit ? 'Close' : 'Cancel'}</Button>
        {!hideSubmit && (
          <Button variant="contained" onClick={onSubmit} disabled={isSubmitting} sx={{ minWidth: 100 }}>
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : submitLabel}
          </Button>
        )}
      </Box>
    </Drawer>
  )
}
