import { Drawer as MuiDrawer, Box, Typography, IconButton, Divider, useMediaQuery } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

type Anchor = 'left' | 'right' | 'top' | 'bottom'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  anchor?: Anchor
  width?: number | string
}

/** Generic drawer — caps width to viewport on small screens. */
export function Drawer({ open, onClose, title, children, anchor = 'right', width = 480 }: Props) {
  const isCompact = useMediaQuery('(max-width:899px)')
  const paperWidth = isCompact
    ? '100%'
    : `min(${typeof width === 'number' ? `${width}px` : width}, 100vw)`

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        zIndex: 1400, // above fixed Toolbar (1201) and sidebar (1300)
        '& .MuiBackdrop-root': { zIndex: 1399 },
      }}
      slotProps={{
        paper: {
          sx: {
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
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, sm: 3 }, py: 2, flexShrink: 0, gap: 1 }}>
        {title && (
          <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>
            {title}
          </Typography>
        )}
        <IconButton size="small" onClick={onClose} sx={{ flexShrink: 0 }}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: { xs: 2, sm: 3 }, overflow: 'auto', flex: 1, minWidth: 0 }}>{children}</Box>
    </MuiDrawer>
  )
}
