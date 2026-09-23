/**
 * QuickCreateFAB — LMS "Create New +" menu parity (floating).
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined"
import GavelIcon from "@mui/icons-material/Gavel"
import EventRepeatIcon from "@mui/icons-material/EventRepeat"
import FiberNewIcon from "@mui/icons-material/FiberNew"
import MoneyOffOutlinedIcon from "@mui/icons-material/MoneyOffOutlined"
import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded"
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined"
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@lib/store/authStore"

const TICKET_URL = "https://legaleagle.atlassian.net/servicedesk/customer/portal/2"
const ICON_SX = { color: "primary.main" }

type Action = {
  key: string
  label: string
  icon: React.ReactNode
  visible: boolean
  onClick: () => void
}

export function QuickCreateFAB() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const roles = useAuthStore(s => s.user?.roles ?? [])
  const isSuperAdmin = roles.some(r => String(r).includes("SUPER_ADMIN"))

  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const open = Boolean(anchor)

  const canLead = hasPermission("/leads") || hasPermission("/my-leads")
  const canActivity = hasPermission("/activities") || hasPermission("/time-log-entries")

  const actions = useMemo<Action[]>(() => [
    {
      key: "lead",
      label: t("create.lead", "Lead"),
      icon: <GroupAddOutlinedIcon fontSize="small" sx={ICON_SX} />,
      visible: canLead,
      onClick: () => navigate(hasPermission("/leads") ? "/leads?new=1" : "/my-leads?new=1"),
    },
    {
      key: "hearing",
      label: t("create.hearing", "Hearing"),
      icon: <GavelIcon fontSize="small" sx={ICON_SX} />,
      visible: true,
      onClick: () => navigate("/team/upcoming-hearings?new=1"),
    },
    {
      key: "continue-hearing",
      label: t("create.continueHearing", "Continue Hearing"),
      icon: <EventRepeatIcon fontSize="small" sx={ICON_SX} />,
      visible: true,
      onClick: () => navigate("/team/hearing-calendar"),
    },
    {
      key: "timelog",
      label: t("create.timeLog", "New Time Log Entry"),
      icon: <FiberNewIcon fontSize="small" sx={ICON_SX} />,
      visible: canActivity,
      onClick: () => navigate("/time-log-entries?new=1&category=Matter"),
    },
    {
      key: "disbursement",
      label: t("create.disbursement", "New Disbursement"),
      icon: <MoneyOffOutlinedIcon fontSize="small" sx={ICON_SX} />,
      visible: canActivity,
      onClick: () => navigate("/time-log-entries?new=1&category=Expense"),
    },
    {
      key: "task",
      label: t("create.task", "Task"),
      icon: <AddTaskRoundedIcon fontSize="small" sx={ICON_SX} />,
      visible: true,
      onClick: () => navigate("/tasks?new=1"),
    },
    {
      key: "template",
      label: t("create.assignTemplate", "Assign Task Template"),
      icon: <AssignmentIndOutlinedIcon fontSize="small" sx={ICON_SX} />,
      visible: true,
      onClick: () => navigate("/tasks?assignTemplate=1"),
    },
    {
      key: "ticket",
      label: t("create.raiseTicket", "Raise Ticket"),
      icon: <HeadsetMicOutlinedIcon fontSize="small" sx={ICON_SX} />,
      visible: true,
      onClick: () => window.open(TICKET_URL, "_blank", "noopener,noreferrer"),
    },
  ], [canLead, canActivity, hasPermission, navigate, t])

  const visible = actions.filter(a => a.visible)

  if (isSuperAdmin) return null

  return (
    <Box sx={{ position: "fixed", bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, zIndex: 1200 }}>
      <Tooltip title={t("layout.createNew", "Create New +")} placement="left">
        <Fab
          color="primary"
          aria-label={t("layout.createNew", "Create New +")}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ borderRadius: "28px", px: { sm: 2 }, width: { sm: "auto" }, minWidth: 56, gap: 0.75 }}
          variant="extended"
        >
          <AddIcon sx={{ mr: { xs: 0, sm: 0.5 } }} />
          <Typography
            component="span"
            sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 600, fontSize: 13, pr: 0.5 }}
          >
            {t("layout.createNew", "Create New +")}
          </Typography>
        </Fab>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{ paper: { sx: { py: 1, minWidth: 240 } } }}
      >
        {visible.map(action => (
          <MenuItem
            key={action.key}
            onClick={() => { setAnchor(null); action.onClick() }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{action.icon}</ListItemIcon>
            <ListItemText primary={action.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
