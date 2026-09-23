import { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { RowMenuItem } from './types'
import { useAuthStore } from '@lib/store/authStore'
import { hasPermission } from '@lib/auth/permissions'

interface Props<T> { items: RowMenuItem<T>[]; row: T }
export function RowMenu<T>({ items, row }: Props<T>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const permissions = useAuthStore((s) => s.permissions)
  const visible = items.filter((item) =>
    (!item.permission || hasPermission(permissions, item.permission)) && !item.hidden?.(row)
  )
  if (!visible.length) return null
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {visible.map((item, i) => (
          <span key={i}>
            {item.divider && <Divider />}
            <MenuItem onClick={() => { item.onClick(row); setAnchor(null) }}
              sx={{ color: item.color === 'error' ? 'error.main' : item.color === 'warning' ? 'warning.main' : 'inherit' }}>
              {item.icon && <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          </span>
        ))}
      </Menu>
    </>
  )
}
