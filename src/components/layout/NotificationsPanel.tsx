/**
 * NotificationsPanel.tsx — notification bell in the toolbar.
 *
 * Features:
 *   - Badge shows unread count (max 99)
 *   - Clicking a notification marks it read
 *   - Clicking a notification navigates to the relevant page
 *     (if notificationType matches a known route pattern)
 *   - "Mark all read" button
 *   - Polls every 60s when panel is open
 *   - Static data mode: uses notifications from src/data/static.ts
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconButton, Badge, Popover, Box, Typography, Divider,
  List, ListItem, ListItemText, Button, CircularProgress, Chip,
} from "@mui/material"
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined"
import DoneAllIcon    from "@mui/icons-material/DoneAll"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { fromNow }     from "@lib/utils/formatDate"
import { QK }         from "@lib/query/keys"
import { env }        from "@/config/env"
import { logger }     from "@/lib/logger"
import { auth as staticAuth } from "@/data/static"

interface Notification {
  id:               string
  title?:           string
  message?:         string
  content?:         string
  read?:            boolean
  isRead?:          boolean
  createdAt?:       string
  notificationType?:string
  /** ID of the related entity (matter, lead, task, etc.) */
  relatedId?:       string
}

/**
 * Determine the navigation path for a notification based on its type.
 * Extend this map as new notification types are added.
 */
function getNotificationPath(n: Notification): string | null {
  const type = n.notificationType?.toLowerCase() ?? ""
  const id   = n.relatedId

  if (type.includes("matter")  && id) return `/matters/${id}`
  if (type.includes("lead")    && id) return `/leads/${id}`
  if (type.includes("task")    && id) return `/tasks/${id}`
  if (type.includes("invoice") && id) return `/billings/${id}`
  if (type.includes("lfa")     && id) return `/lfa/${id}`
  return null
}

export function NotificationsPanel() {
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: QK.notifications.list(),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        logger.debug("NotificationsPanel", "Using static notifications")
        return staticAuth.notifications.map(n => ({
          id:    n.id,
          title: n.title,
          read:  !n.status,   // status=true means unread in static data
          createdAt: n.createdAt,
        }))
      }
      const r = await axiosClient.get("/api/notification/get")
      return r.data?.data ?? r.data ?? []
    },
    refetchInterval: 60_000,
    enabled: !!anchor,    // only fetch when panel is open
    staleTime: 30_000,
  })

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length

  async function markAllRead() {
    logger.info("NotificationsPanel", "Marking all notifications as read")
    if (!env.USE_STATIC_DATA) {
      try {
        await axiosClient.put("/api/notification/read/all")
      } catch (e) {
        logger.error("NotificationsPanel", "Failed to mark all read", e)
      }
    }
    qc.invalidateQueries({ queryKey: QK.notifications.list() })
  }

  async function markRead(id: string) {
    if (!env.USE_STATIC_DATA) {
      try {
        await axiosClient.put(`/api/notification/read/${id}`)
      } catch (e) {
        logger.error("NotificationsPanel", "Failed to mark read", e)
      }
    }
    qc.invalidateQueries({ queryKey: QK.notifications.list() })
  }

  function handleNotificationClick(n: Notification) {
    // Mark as read
    if (!n.read && !n.isRead) markRead(n.id)

    // Navigate if there is a related entity
    const path = getNotificationPath(n)
    if (path) {
      logger.info("NotificationsPanel", `Navigating to ${path} from notification`)
      navigate(path)
      setAnchor(null)
    }
  }

  return (
    <>
      <IconButton size="small" onClick={e => setAnchor(e.currentTarget)} aria-label="Notifications">
        <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
          <NotificationsOutlinedIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 380, maxHeight: 480, display: "flex", flexDirection: "column", borderRadius: 2 }
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications
            {unreadCount > 0 && (
              <Chip size="small" label={unreadCount} color="primary" sx={{ ml: 1 }} />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ fontSize: 12 }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {/* List */}
        <List disablePadding sx={{ flex: 1, overflowY: "auto" }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            notifications.slice(0, 20).map(n => {
              const isUnread  = !n.read && !n.isRead
              const hasNav    = !!getNotificationPath(n)
              return (
                <ListItem
                  key={n.id}
                  divider
                  onClick={() => handleNotificationClick(n)}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    cursor: hasNav || isUnread ? "pointer" : "default",
                    alignItems: "flex-start",
                    bgcolor: isUnread ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                    transition: "background-color 150ms",
                  }}
                >
                  {/* Unread indicator dot */}
                  {isUnread && (
                    <Box sx={{
                      width: 7, height: 7, borderRadius: "50%",
                      bgcolor: "primary.main",
                      mt: 0.75, mr: 1.5, flexShrink: 0,
                    }} />
                  )}
                  <ListItemText
                    primary={n.title ?? n.notificationType ?? "Notification"}
                    secondary={
                      <Box component="span" sx={{ display: "block" }}>
                        {(n.message ?? n.content) && (
                          <Box component="span" sx={{ display: "block", fontSize: 13, color: "text.secondary", lineHeight: 1.5 }}>
                            {n.message ?? n.content}
                          </Box>
                        )}
                        <Box component="span" sx={{ fontSize: 11, color: "text.disabled" }}>
                          {fromNow(n.createdAt)}
                        </Box>
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
