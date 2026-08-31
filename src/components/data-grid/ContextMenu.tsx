/**
 * ContextMenu.tsx — right-click context menu for DataGrid rows.
 *
 * Shows the same items as the 3-dot RowMenu but as a native-feeling
 * right-click menu. Positioned at the cursor, closes on click-outside,
 * Escape, or any action.
 *
 * Usage: handled automatically by DataGrid when rowMenuItems is provided.
 * No extra props needed on the page side.
 */
import { useEffect, useRef } from 'react'
import { Paper, MenuItem, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material'
import type { RowMenuItem } from './types'

interface Props<T> {
  items:    RowMenuItem<T>[]
  row:      T
  x:        number
  y:        number
  onClose:  () => void
}

export function ContextMenu<T>({ items, row, x, y, onClose }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on click-outside or Escape
  useEffect(() => {
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === 'Escape') { onClose(); return }
      if (e instanceof MouseEvent && ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handle)
    }
  }, [onClose])

  // Adjust position so menu doesn't overflow viewport
  const menuW = 200
  const menuH = items.length * 36 + 16
  const left  = x + menuW > window.innerWidth  ? x - menuW : x
  const top   = y + menuH > window.innerHeight ? y - menuH : y

  return (
    <Paper
      ref={ref}
      elevation={8}
      sx={{
        position: 'fixed',
        left, top,
        zIndex: 9999,
        minWidth: menuW,
        borderRadius: 1.5,
        py: 0.5,
        overflow: 'hidden',
        // Subtle entrance animation
        animation: 'contextFadeIn 100ms ease-out',
        '@keyframes contextFadeIn': {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      {items.map((item, i) => (
        <span key={i}>
          {item.divider && <Divider />}
          <MenuItem
            dense
            onClick={() => { item.onClick(row); onClose() }}
            sx={{
              color: item.color === 'error'   ? 'error.main'
                   : item.color === 'warning' ? 'warning.main'
                   : 'inherit',
              py: 0.75,
              gap: 1,
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ color: 'inherit', minWidth: 28 }}>
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {item.label}
                </Typography>
              }
            />
          </MenuItem>
        </span>
      ))}
    </Paper>
  )
}
