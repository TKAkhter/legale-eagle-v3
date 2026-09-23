/**
 * MatterTimeline.tsx — vertical chronological timeline of all matter events.
 *
 * Aggregates: matter creation, hearings, tasks, timelogs, invoices
 * into a single sorted timeline. Each event type has a distinct icon + colour.
 *
 * Static mode: merges all static matter arrays into one sorted list.
 * Live mode:   same — data comes from the already-loaded detail page queries.
 */
import { Box, Typography, Paper, Chip } from "@mui/material"
import GavelIcon        from "@mui/icons-material/Gavel"
import EventIcon        from "@mui/icons-material/Event"
import AssignmentIcon   from "@mui/icons-material/Assignment"
import TimerIcon        from "@mui/icons-material/Timer"
import ReceiptIcon      from "@mui/icons-material/Receipt"
import CheckCircleIcon  from "@mui/icons-material/CheckCircle"
import { formatDate }   from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"

type EventType = "created" | "hearing" | "task" | "timelog" | "invoice"

interface TimelineEvent {
  id:          string
  type:        EventType
  date:        string
  title:       string
  subtitle?:   string
  badge?:      string
  badgeColor?: "default" | "success" | "error" | "warning" | "info"
  amount?:     number
}

const TYPE_CONFIG: Record<EventType, {
  icon:    React.ReactNode
  color:   string
  bgcolor: string
  label:   string
}> = {
  created: { icon: <GavelIcon sx={{ fontSize: 16 }} />,      color: "#0F3C6E", bgcolor: "#0F3C6E20", label: "Matter" },
  hearing: { icon: <EventIcon sx={{ fontSize: 16 }} />,      color: "#7C3AED", bgcolor: "#7C3AED20", label: "Hearing" },
  task:    { icon: <AssignmentIcon sx={{ fontSize: 16 }} />, color: "#D97706", bgcolor: "#D9770620", label: "Task" },
  timelog: { icon: <TimerIcon sx={{ fontSize: 16 }} />,      color: "#059669", bgcolor: "#05966920", label: "Time Log" },
  invoice: { icon: <ReceiptIcon sx={{ fontSize: 16 }} />,    color: "#DC2626", bgcolor: "#DC262620", label: "Invoice" },
}

interface Props {
  matter:   Record<string, unknown>
  hearings: Record<string, unknown>[]
  tasks:    Record<string, unknown>[]
  timelogs: Record<string, unknown>[]
  invoices: Record<string, unknown>[]
}

export function MatterTimeline({ matter, hearings, tasks, timelogs, invoices }: Props) {

  // Build unified event list
  const events: TimelineEvent[] = []

  // Matter creation
  events.push({
    id:    "created",
    type:  "created",
    date:  String(matter.createdAt ?? matter.openDate ?? ""),
    title: `Matter ${String(matter.title ?? matter.matterSeq ?? "")} opened`,
    subtitle: String(matter.matterSubject ?? matter.description ?? ""),
  })

  // Hearings
  for (const h of hearings) {
    events.push({
      id:         `hearing-${h.id}`,
      type:       "hearing",
      date:       String(h.hearingDate ?? ""),
      title:      String(h.hearingTitle ?? "Hearing"),
      subtitle:   `${String(h.court ?? "")}${h.room ? ` · Room ${h.room}` : ""}`,
      badge:      String(h.status ?? ""),
      badgeColor: String(h.status ?? "").toLowerCase() === "completed" ? "success" : "info",
    })
  }

  // Tasks
  for (const t of tasks) {
    const done = String(t.taskStatus ?? "").toLowerCase() === "completed"
    events.push({
      id:         `task-${t.id}`,
      type:       "task",
      date:       String(t.taskDeadLine ?? t.createdAt ?? ""),
      title:      String(t.taskName ?? "Task"),
      subtitle:   (() => { const a = t.assignedTo as {firstName?:string;lastName?:string}|null; return a ? `${a.firstName} ${a.lastName}` : undefined })(),
      badge:      String(t.taskStatus ?? ""),
      badgeColor: done ? "success" : String(t.priority ?? "").toLowerCase() === "high" ? "error" : "warning",
    })
  }

  // Time logs
  for (const tl of timelogs) {
    const p = tl.responsiblePerson as {firstName?:string;lastName?:string}|null
    events.push({
      id:       `tl-${tl.id}`,
      type:     "timelog",
      date:     String(tl.entryDate ?? ""),
      title:    String(tl.activity ?? "Time Entry"),
      subtitle: p ? `${p.firstName} ${p.lastName}` : undefined,
      amount:   Number(tl.billing ?? 0),
      badge:    String(tl.revenueStatus ?? ""),
    })
  }

  // Invoices
  for (const inv of invoices) {
    events.push({
      id:         `inv-${inv.id}`,
      type:       "invoice",
      date:       String(inv.issueDate ?? ""),
      title:      `Invoice ${String(inv.invoiceNo ?? "")}`,
      subtitle:   `Due ${formatDate(String(inv.dueDate ?? ""))}`,
      amount:     Number(inv.taxableAmount ?? inv.amount ?? 0),
      badge:      String(inv.invoiceStatus ?? ""),
      badgeColor: String(inv.invoiceStatus ?? "").toLowerCase() === "paid" ? "success"
                : String(inv.invoiceStatus ?? "").toLowerCase() === "overdue" ? "error" : "warning",
    })
  }

  // Sort chronologically (oldest first)
  const sorted = events
    .filter(e => e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (sorted.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">No timeline events yet</Typography>
      </Box>
    )
  }

  // Group by month-year for section headers
  let lastMonthYear = ""

  return (
    <Box sx={{ pl: 1, pt: 1 }}>
      {sorted.map((event, idx) => {
        const cfg = TYPE_CONFIG[event.type]
        const isLast = idx === sorted.length - 1

        // Month-year header
        const d = new Date(event.date)
        const monthYear = isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        const showHeader = monthYear && monthYear !== lastMonthYear
        if (showHeader) lastMonthYear = monthYear

        return (
          <Box key={event.id}>
            {/* Month-year section header */}
            {showHeader && (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "text.disabled", textTransform: "uppercase",
                  letterSpacing: "0.08em", fontSize: 10, display: "block",
                  mb: 1.5, mt: idx > 0 ? 3 : 0 }}
              >
                {monthYear}
              </Typography>
            )}

            {/* Event row */}
            <Box sx={{ display: "flex", gap: 2, mb: isLast ? 0 : 0 }}>
              {/* Icon + connector line */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: "50%",
                  bgcolor: cfg.bgcolor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: cfg.color, flexShrink: 0, zIndex: 1,
                }}>
                  {cfg.icon}
                </Box>
                {!isLast && (
                  <Box sx={{ width: 2, flex: 1, bgcolor: "divider", mt: 0.5, mb: 0.5, minHeight: 24 }} />
                )}
              </Box>

              {/* Content card */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75, mb: 1.5, flex: 1, borderRadius: 2,
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                  transition: "border-color 150ms",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    {/* Type label + date */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700,
                        color: cfg.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {cfg.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        · {event.date ? formatDate(event.date) : ""}
                      </Typography>
                    </Box>

                    {/* Title */}
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {event.title}
                    </Typography>

                    {/* Subtitle */}
                    {event.subtitle && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {event.subtitle}
                      </Typography>
                    )}
                  </Box>

                  {/* Right side: amount + badge */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                    {event.amount != null && event.amount > 0 && (
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontSize: 13 }}>
                        {formatCurrency(event.amount)}
                      </Typography>
                    )}
                    {event.badge && (
                      <Chip
                        size="small"
                        label={event.badge.replace(/_/g, " ")}
                        color={event.badgeColor ?? "default"}
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, "& .MuiChip-label": { px: 0.75 } }}
                      />
                    )}
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
