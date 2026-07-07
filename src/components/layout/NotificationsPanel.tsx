import { useState } from 'react'
import {
  IconButton, Badge, Popover, Box, Typography, Divider,
  List, ListItem, ListItemText, Button, CircularProgress, Chip,
} from '@mui/material'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { fromNow } from '@lib/utils/formatDate'
import { QK } from '@lib/query/keys'

interface Notification {
  id: string
  title?: string
  message?: string
  content?: string
  read?: boolean
  isRead?: boolean
  createdAt?: string
  notificationType?: string
}

export function NotificationsPanel() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: QK.notifications.list(),
    queryFn: async () => {
      const r = await axiosClient.get('/api/notification/get')
      return r.data?.data ?? r.data ?? []
    },
    refetchInterval: 60_000, // poll every 60s
    enabled: !!anchor,        // only fetch when panel is open to save requests
    staleTime: 30_000,
  })

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length

  async function markAllRead() {
    try {
      await axiosClient.put('/api/notification/read/all')
      qc.invalidateQueries({ queryKey: QK.notifications.list() })
    } catch { /* best-effort */ }
  }

  async function markRead(id: string) {
    try {
      await axiosClient.put(`/api/notification/read/${id}`)
      qc.invalidateQueries({ queryKey: QK.notifications.list() })
    } catch { /* best-effort */ }
  }

  return (
    <>
      <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
        <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
          <NotificationsOutlinedIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 480, display: 'flex', flexDirection: 'column' } } }}
      >
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications {unreadCount > 0 && <Chip size="small" label={unreadCount} color="primary" sx={{ ml: 1 }} />}
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ fontSize: 12 }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const isUnread = !n.read && !n.isRead
              return (
                <ListItem
                  key={n.id}
                  divider
                  onClick={() => { if (isUnread) markRead(n.id) }}
                  sx={{
                    px: 2.5, py: 1.5, cursor: 'pointer', alignItems: 'flex-start',
                    bgcolor: isUnread ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {isUnread && (
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75, mr: 1.5, flexShrink: 0 }} />
                  )}
                  <ListItemText
                    primary={n.title ?? n.notificationType ?? 'Notification'}
                    secondary={
                      <Box component="span" sx={{ display: 'block' }}>
                        <Box component="span" sx={{ display: 'block', fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                          {n.message ?? n.content ?? ''}
                        </Box>
                        <Box component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>{fromNow(n.createdAt)}</Box>
                      </Box>
                    }
                    slotProps={{ primary: { style: { fontWeight: isUnread ? 600 : 400, fontSize: 13 } } }}
                    sx={{ m: 0 }}
                  />
                </ListItem>
              )
            })
          )}
        </List>
      </Popover>
    </>
  )
}
