/**
 * ActivityFeed.tsx — recent firm-wide activity widget.
 *
 * Shows the last N actions with actor avatar, description, entity link,
 * and relative timestamp. Used on the dashboard.
 *
 * Each activity type has a colour-coded icon so users can scan quickly:
 *   matter_created  → gavel (blue)
 *   invoice_paid    → check circle (green)
 *   lead_converted  → swap horiz (teal)
 *   task_completed  → task alt (purple)
 *   client_created  → person add (navy)
 *   timelog_approved→ schedule (amber)
 *   user_login      → login (gray)
 */
import { Box, Typography, Avatar, Skeleton, Paper, Chip } from "@mui/material"
import GavelIcon          from "@mui/icons-material/Gavel"
import CheckCircleIcon    from "@mui/icons-material/CheckCircle"
import SwapHorizIcon      from "@mui/icons-material/SwapHoriz"
import TaskAltIcon        from "@mui/icons-material/TaskAlt"
import PersonAddIcon      from "@mui/icons-material/PersonAdd"
import ScheduleIcon       from "@mui/icons-material/Schedule"
import LoginIcon          from "@mui/icons-material/Login"
import ReceiptIcon        from "@mui/icons-material/Receipt"
import DescriptionIcon    from "@mui/icons-material/Description"
import { useQuery }       from "@tanstack/react-query"
import { useNavigate }    from "react-router-dom"
import { activityApi, type ActivityItem } from "@/api/activity"
import { fromNow }        from "@lib/utils/formatDate"

/** Icon + colour per activity type */
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  matter_created:   { icon: <GavelIcon   sx={{ fontSize: 16 }} />, color: "#3B82F6", bg: "#3B82F620" },
  matter_closed:    { icon: <GavelIcon   sx={{ fontSize: 16 }} />, color: "#94A3B8", bg: "#94A3B820" },
  invoice_paid:     { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: "#22C55E", bg: "#22C55E20" },
  invoice_created:  { icon: <ReceiptIcon sx={{ fontSize: 16 }} />, color: "#F59E0B", bg: "#F59E0B20" },
  lead_converted:   { icon: <SwapHorizIcon sx={{ fontSize: 16 }} />, color: "#00B4A6", bg: "#00B4A620" },
  lead_followup:    { icon: <DescriptionIcon sx={{ fontSize: 16 }} />, color: "#00B4A6", bg: "#00B4A615" },
  task_completed:   { icon: <TaskAltIcon sx={{ fontSize: 16 }} />, color: "#8B5CF6", bg: "#8B5CF620" },
  client_created:   { icon: <PersonAddIcon sx={{ fontSize: 16 }} />, color: "#0F3C6E", bg: "#0F3C6E20" },
  timelog_approved: { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: "#F59E0B", bg: "#F59E0B20" },
  user_login:       { icon: <LoginIcon   sx={{ fontSize: 16 }} />, color: "#94A3B8", bg: "#94A3B820" },
}

/** Entity type → route path prefix */
const ENTITY_PATHS: Record<string, string> = {
  Matter:  "/matters",
  Invoice: "/billings",
  Lead:    "/leads",
  Client:  "/clients",
  Task:    "/tasks",
}

interface Props {
  limit?: number
}

export function ActivityFeed({ limit = 8 }: Props) {
  const navigate = useNavigate()

  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["activity", "feed", limit],
    queryFn: () => activityApi.getFeed(limit),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  })

  function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  }

  function handleClick(item: ActivityItem) {
    const prefix = ENTITY_PATHS[item.entity]
    if (prefix && item.entityId) navigate(`${prefix}/${item.entityId}`)
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Recent Activity</Typography>
        <Chip size="small" label="Live" color="success" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
      </Box>

      {/* Feed items */}
      <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5, px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="40%" height={14} />
              </Box>
            </Box>
          ))
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No recent activity</Typography>
          </Box>
        ) : (
          items.map(item => {
            const config   = TYPE_CONFIG[item.type] ?? TYPE_CONFIG["user_login"]
            const hasLink  = !!(ENTITY_PATHS[item.entity] && item.entityId)

            return (
              <Box
                key={item.id}
                onClick={() => hasLink && handleClick(item)}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: hasLink ? "pointer" : "default",
                  "&:hover": hasLink ? { bgcolor: "action.hover" } : {},
                  transition: "background-color 150ms",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                {/* Activity type icon */}
                <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: config.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: config.color }}>
                  {config.icon}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Actor */}
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: 12 }}>
                        {item.actor}
                      </Typography>
                      {/* Description */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 12 }}>
                        {item.description}
                      </Typography>
                      {/* Entity name */}
                      {item.entityName && (
                        <Typography variant="caption" sx={{ fontSize: 11, color: config.color, fontWeight: 500 }} noWrap>
                          {item.entityName}
                        </Typography>
                      )}
                    </Box>
                    {/* Timestamp */}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, flexShrink: 0, mt: 0.25 }}>
                      {fromNow(item.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )
          })
        )}
      </Box>
    </Paper>
  )
}
