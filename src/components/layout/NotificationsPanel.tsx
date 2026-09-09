/**
 * NotificationsPanel.tsx — notification bell with background polling + browser push.
 *
 * Features:
 *   - Badge shows unread count (max 99+)
 *   - Background poll every 30s (not just when open)
 *   - Browser push notification on new items (if permission granted)
 *   - Sound toggle (🔔/🔕)
 *   - Click → navigate to related entity
 *   - "Mark all read" button
 *   - Static mode: uses notifications from src/data/static.ts
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton, Badge, Popover, Box, Typography, Divider,
  List, ListItem, ListItemText, Button, CircularProgress,
  Tooltip, Chip,
} from '@mui/material'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import NotificationsActiveIcon   from '@mui/icons-material/NotificationsActive'
import DoneAllIcon               from '@mui/icons-material/DoneAll'
import VolumeUpIcon              from '@mui/icons-material/VolumeUp'
import VolumeOffIcon             from '@mui/icons-material/VolumeOff'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient }           from '@lib/api/axios'
import { fromNow }               from '@lib/utils/formatDate'
import { QK }                    from '@lib/query/keys'
import { env }                   from '@/config/env'
import { logger }                from '@/lib/logger'
import { usePushNotifications }  from '@/hooks/usePushNotifications'
import { useNotificationStore }  from '@/lib/store/notificationStore'

interface Notification {
  id:                string
  title?:            string
  message?:          string
  content?:          string
  read?:             boolean
  isRead?:           boolean
  createdAt?:        string
  notificationType?: string
  relatedId?:        string
}

function getNotificationPath(n: Notification): string | null {
  const type = n.notificationType?.toLowerCase() ?? ''
  const id   = n.relatedId
  if (type.includes('matter')   && id) return `/matters/${id}`
  if (type.includes('lead')     && id) return `/leads/${id}`
  if (type.includes('task')     && id) return `/tasks/${id}`
  if (type.includes('invoice')  && id) return `/billings/${id}`
  if (type.includes('client')   && id) return `/clients/${id}`
  if (type.includes('hearing')  && id) return `/matters/${id}`
  if (type.includes('approval'))       return '/approvals/task'
  return null
}

const STATIC_NOTIFICATIONS: Notification[] = [
  { id:'n1', title:'Task overdue',           message:'File court documents is past its deadline',                notificationType:'task',     relatedId:'t1',   read:false, createdAt: new Date(Date.now()-600000).toISOString() },
  { id:'n2', title:'Hearing tomorrow',       message:'Building Dispute — First Directions Hearing at 10:00 AM', notificationType:'hearing',  relatedId:'6a4f9f5e096c2631a41a8193', read:false, createdAt: new Date(Date.now()-3600000).toISOString() },
  { id:'n3', title:'Invoice approved',       message:'INV-2025-001 has been approved for payment',              notificationType:'invoice',  relatedId:'inv1',  read:true,  createdAt: new Date(Date.now()-86400000).toISOString() },
  { id:'n4', title:'New lead assigned',      message:'Mohammed Al Rashid has been assigned to you',             notificationType:'lead',     relatedId:'l1',    read:true,  createdAt: new Date(Date.now()-172800000).toISOString() },
]

export function NotificationsPanel() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [anchor, setAnchor] = useState<HTMLElement|null>(null)
  const prevIdsRef  = useRef<Set<string>>(new Set())

  const { permission, requestPermission, notify } = usePushNotifications()
  const { hasSeen, markSeen, soundOn, toggleSound } = useNotificationStore()

  // ── Data — poll every 30s in background ────────────────────────────────────
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: QK.notifications.list(),
    queryFn: async () => {
      logger.debug('NotificationsPanel', 'Polling notifications')
      if (env.USE_STATIC_DATA) return STATIC_NOTIFICATIONS
      const r = await axiosClient.get('/api/notification/get')
      return r.data?.data ?? r.data ?? []
    },
    refetchInterval: 30_000,     // poll every 30s
    staleTime:       25_000,
  })

  const unread = notifications.filter(n => !n.read && !n.isRead).length

  // ── Fire browser push for new unread notifications ─────────────────────────
  useEffect(() => {
    const newUnread = notifications.filter(n => !n.read && !n.isRead && !hasSeen(n.id))
    for (const n of newUnread) {
      markSeen(n.id)
      const title = n.title ?? 'LegalEagle'
      const body  = n.message ?? n.content ?? ''
      notify({ title, body, tag: n.id, onClick: () => {
        const path = getNotificationPath(n)
        if (path) navigate(path)
      }})
      // Play a subtle notification sound if enabled
      if (soundOn && typeof AudioContext !== 'undefined') {
        try {
          const ctx  = new AudioContext()
          const osc  = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(880, ctx.currentTime)
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
          gain.gain.setValueAtTime(0.1, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.start(); osc.stop(ctx.currentTime + 0.3)
        } catch { /* audio blocked */ }
      }
    }
  }, [notifications]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAllRead() {
    if (!env.USE_STATIC_DATA) {
      try { await axiosClient.post('/api/notification/read/all') } catch { /* ignore */ }
    }
    qc.invalidateQueries({ queryKey: QK.notifications.list() })
  }

  async function markRead(id: string) {
    if (!env.USE_STATIC_DATA) {
      try { await axiosClient.post(`/api/notification/read/${id}`) } catch { /* ignore */ }
    }
    qc.invalidateQueries({ queryKey: QK.notifications.list() })
  }

  function handleClick(n: Notification) {
    markRead(n.id)
    const path = getNotificationPath(n)
    if (path) navigate(path)
    setAnchor(null)
  }

  const open = !!anchor

  return (
    <>
      <Tooltip title={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}>
        <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
          <Badge badgeContent={unread > 99 ? '99+' : unread} color="error" max={99}>
            {unread > 0
              ? <NotificationsActiveIcon fontSize="small" />
              : <NotificationsOutlinedIcon fontSize="small" />
            }
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, borderRadius: 2, maxHeight: 520 } } }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
            {unread > 0 && <Chip size="small" label={unread} color="error" sx={{ height: 18, fontSize: 11 }} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Sound toggle */}
            <Tooltip title={soundOn ? 'Mute sounds' : 'Enable sounds'}>
              <IconButton size="small" onClick={toggleSound}>
                {soundOn
                  ? <VolumeUpIcon  sx={{ fontSize: 16 }} />
                  : <VolumeOffIcon sx={{ fontSize: 16 }} />
                }
              </IconButton>
            </Tooltip>
            {/* Push permission */}
            {permission === 'default' && (
              <Tooltip title="Enable browser notifications">
                <Button size="small" onClick={requestPermission} sx={{ fontSize: 11 }}>Allow push</Button>
              </Tooltip>
            )}
            {unread > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={markAllRead}><DoneAllIcon sx={{ fontSize: 16 }} /></IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Divider />

        {/* List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map(n => {
              const isUnread = !n.read && !n.isRead
              return (
                <ListItem
                  key={n.id}
                  onClick={() => handleClick(n)}
                  divider
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isUnread ? 'action.hover' : 'transparent',
                    alignItems: 'flex-start',
                    gap: 1,
                    py: 1.5,
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  {isUnread && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, mt: 0.75 }} />
                  )}
                  <ListItemText
                    sx={{ m: 0, pl: isUnread ? 0 : 2 }}
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: isUnread ? 600 : 400, lineHeight: 1.4 }}>
                        {n.title ?? 'Notification'}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4, mt: 0.25 }}>
                          {n.message ?? n.content ?? ''}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block' }}>
                          {fromNow(n.createdAt ?? '')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        )}
      </Popover>
    </>
  )
}
