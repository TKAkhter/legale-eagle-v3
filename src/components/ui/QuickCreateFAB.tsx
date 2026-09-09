/**
 * QuickCreateFAB.tsx — floating speed-dial for quick record creation.
 *
 * Shows on mobile and as a convenience on desktop.
 * Opens sub-actions: New Lead, New Task, Log Time, New Matter.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import AssignmentIcon from "@mui/icons-material/Assignment"
import TimerIcon from "@mui/icons-material/Timer"
import GavelIcon from "@mui/icons-material/Gavel"

const ACTIONS = [
  { icon: <PersonAddIcon />,  name: "New Lead",    path: "/leads?new=1"    },
  { icon: <GavelIcon />,      name: "New Matter",  path: "/matters?new=1"  },
  { icon: <AssignmentIcon />, name: "New Task",    path: "/tasks?new=1"    },
  { icon: <TimerIcon />,      name: "Log Time",    path: "/time-log-entries?new=1" },
]

export function QuickCreateFAB() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <SpeedDial
      ariaLabel="Quick create"
      sx={{
        position: "fixed",
        bottom: { xs: 16, sm: 24 },
        right:  { xs: 16, sm: 24 },
        zIndex: 1200,
        "& .MuiFab-primary": { bgcolor: "primary.main" },
      }}
      icon={<SpeedDialIcon />}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    >
      {ACTIONS.map(action => (
        <SpeedDialAction
          key={action.name}
          icon={action.icon}
          onClick={() => { setOpen(false); navigate(action.path) }}
        />
      ))}
    </SpeedDial>
  )
}
