/**
 * QuickCreateFAB — floating speed-dial for quick record creation.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import AssignmentIcon from "@mui/icons-material/Assignment"
import TimerIcon from "@mui/icons-material/Timer"
import GavelIcon from "@mui/icons-material/Gavel"
import { useTranslation } from "react-i18next"

const ACTIONS = [
  { icon: <PersonAddIcon fontSize="small" />,  name: "New Lead",   tooltip: "Create a new lead",   path: "/leads?new=1" },
  { icon: <GavelIcon fontSize="small" />,      name: "New Matter", tooltip: "Open a new matter",   path: "/matters?new=1" },
  { icon: <AssignmentIcon fontSize="small" />, name: "New Task",   tooltip: "Create a new task",   path: "/tasks?new=1" },
  { icon: <TimerIcon fontSize="small" />,      name: "Log Time",   tooltip: "Log a time entry",    path: "/time-log-entries?new=1" },
]

export function QuickCreateFAB() {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const open = Boolean(anchor)

  return (
    <Box sx={{ position: "fixed", bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, zIndex: 1200 }}>
      <Tooltip title={t("layout.quickCreateHint", "Quick create — Lead, Matter, Task, or Time Log")} placement="left">
        <Fab
          color="primary"
          aria-label={t("layout.quickCreate", "Quick create")}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {ACTIONS.map(action => (
          <MenuItem
            key={action.name}
            title={action.tooltip}
            onClick={() => { setAnchor(null); navigate(action.path) }}
          >
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText primary={action.name} secondary={action.tooltip} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
