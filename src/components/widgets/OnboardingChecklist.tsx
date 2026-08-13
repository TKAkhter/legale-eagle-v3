/**
 * OnboardingChecklist.tsx — "Get started" checklist for new firms.
 *
 * Shown on the dashboard when the firm is newly set up.
 * Each step links to the relevant page.
 * Dismissed state is saved to localStorage.
 *
 * Steps are automatically checked off based on actual data
 * (e.g. "Add first client" checks when clientCount > 0).
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Paper, Typography, LinearProgress,
  List, ListItem, ListItemIcon, ListItemText,
  Button, IconButton, Chip, Collapse,
} from "@mui/material"
import CheckCircleIcon  from "@mui/icons-material/CheckCircle"
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import CloseIcon        from "@mui/icons-material/Close"
import EmojiEventsIcon  from "@mui/icons-material/EmojiEvents"
import { logger }       from "@/lib/logger"

interface Step {
  id:       string
  label:    string
  desc:     string
  path:     string
  done:     boolean
}

interface Props {
  /** Pass actual counts so steps auto-check */
  counts?: {
    clients?:  number
    matters?:  number
    users?:    number
    invoices?: number
  }
}

const STORAGE_KEY = "le-onboarding-dismissed"

export function OnboardingChecklist({ counts = {} }: Props) {
  const navigate   = useNavigate()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  )
  const [collapsed, setCollapsed] = useState(false)

  function dismiss() {
    logger.info("OnboardingChecklist", "User dismissed onboarding checklist")
    localStorage.setItem(STORAGE_KEY, "true")
    setDismissed(true)
  }

  if (dismissed) return null

  const steps: Step[] = [
    {
      id: "company",
      label: "Configure company settings",
      desc:  "Add your firm name, logo, currency and tax settings",
      path:  "/admin/settings",
      done:  true,  // always done (set up during onboarding)
    },
    {
      id: "users",
      label: "Invite team members",
      desc:  "Add attorneys and support staff to the platform",
      path:  "/admin/users",
      done:  (counts.users ?? 0) > 1,
    },
    {
      id: "client",
      label: "Add your first client",
      desc:  "Create a client profile to start managing their matters",
      path:  "/clients",
      done:  (counts.clients ?? 0) > 0,
    },
    {
      id: "matter",
      label: "Open your first matter",
      desc:  "Create a matter linked to a client",
      path:  "/matters",
      done:  (counts.matters ?? 0) > 0,
    },
    {
      id: "invoice",
      label: "Generate your first invoice",
      desc:  "Bill a client for a completed matter",
      path:  "/billings",
      done:  (counts.invoices ?? 0) > 0,
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const progress  = Math.round((doneCount / steps.length) * 100)
  const allDone   = doneCount === steps.length

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, overflow: "hidden", mb: 3, borderColor: allDone ? "success.main" : "primary.main", borderWidth: 1.5 }}
    >
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.75,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        bgcolor: allDone ? "success.main" : "primary.main",
        color: "white",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {allDone ? "🎉 Setup complete!" : "Get started with LegalEagle"}
          </Typography>
          <Chip
            size="small"
            label={`${doneCount}/${steps.length}`}
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" sx={{ color: "white" }} onClick={() => setCollapsed(c => !c)}>
            <ChevronRightIcon sx={{ fontSize: 18, transform: collapsed ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform 200ms" }} />
          </IconButton>
          <IconButton size="small" sx={{ color: "white" }} onClick={dismiss}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!collapsed}>
        {/* Progress bar */}
        <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Setup progress</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3,
              "& .MuiLinearProgress-bar": { bgcolor: allDone ? "success.main" : "primary.main" } }}
          />
        </Box>

        {/* Steps */}
        <List dense disablePadding sx={{ pb: 1 }}>
          {steps.map(step => (
            <ListItem
              key={step.id}
              onClick={() => !step.done && navigate(step.path)}
              sx={{
                px: 2.5, py: 1,
                cursor: step.done ? "default" : "pointer",
                opacity: step.done ? 0.7 : 1,
                "&:hover": step.done ? {} : { bgcolor: "action.hover" },
                transition: "background-color 150ms",
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {step.done
                  ? <CheckCircleIcon sx={{ color: "success.main", fontSize: 20 }} />
                  : <RadioButtonUncheckedIcon sx={{ color: "text.disabled", fontSize: 20 }} />
                }
              </ListItemIcon>
              <ListItemText
                primary={step.label}
                secondary={step.done ? undefined : step.desc}
                slotProps={{
                  primary: { style: {
                    fontSize: 13,
                    fontWeight: step.done ? 400 : 600,
                    textDecoration: step.done ? "line-through" : "none",
                    color: step.done ? "inherit" : undefined,
                  }},
                  secondary: { style: { fontSize: 11 } },
                }}
              />
              {!step.done && (
                <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} />
              )}
            </ListItem>
          ))}
        </List>

        {allDone && (
          <Box sx={{ px: 2.5, pb: 2 }}>
            <Button size="small" onClick={dismiss}>
              Dismiss — I'm all set
            </Button>
          </Box>
        )}
      </Collapse>
    </Paper>
  )
}
