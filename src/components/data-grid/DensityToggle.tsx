/**
 * DensityToggle.tsx — row density selector for DataGrid.
 * Saves preference to localStorage so it persists between sessions.
 *
 * Compact:     very tight rows, maximum data density
 * Normal:      default — comfortable for most use cases
 * Comfortable: more padding, easier to read on large screens
 */
import { useState } from "react"
import { IconButton, Popover, MenuItem, ListItemIcon, ListItemText, Tooltip, Divider, Typography, Box } from "@mui/material"
import DensitySmallIcon  from "@mui/icons-material/DensitySmall"
import DensityMediumIcon from "@mui/icons-material/DensityMedium"
import DensityLargeIcon  from "@mui/icons-material/DensityLarge"
import type { TableDensity } from "./types"

const STORAGE_KEY = "le-grid-density"

const OPTIONS: { value: TableDensity; label: string; icon: React.ReactNode }[] = [
  { value: "compact",     label: "Compact",     icon: <DensitySmallIcon  fontSize="small" /> },
  { value: "normal",      label: "Normal",      icon: <DensityMediumIcon fontSize="small" /> },
  { value: "comfortable", label: "Comfortable", icon: <DensityLargeIcon  fontSize="small" /> },
]

interface Props {
  value:    TableDensity
  onChange: (d: TableDensity) => void
}

export function DensityToggle({ value, onChange }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  function select(d: TableDensity) {
    localStorage.setItem(STORAGE_KEY, d)
    onChange(d)
    setAnchor(null)
  }

  const currentIcon = OPTIONS.find(o => o.value === value)?.icon ?? <DensityMediumIcon fontSize="small" />

  return (
    <>
      <Tooltip title="Row density">
        <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
          {currentIcon}
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ "& .MuiPopover-paper": { borderRadius: 2, minWidth: 160, boxShadow: 4 } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Row Density
          </Typography>
        </Box>
        <Divider />
        {OPTIONS.map(opt => (
          <MenuItem
            key={opt.value}
            selected={value === opt.value}
            onClick={() => select(opt.value)}
            dense
          >
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText>{opt.label}</ListItemText>
          </MenuItem>
        ))}
      </Popover>
    </>
  )
}

/** Load saved density from localStorage */
export function loadDensity(defaultDensity: TableDensity = "normal"): TableDensity {
  const saved = localStorage.getItem(STORAGE_KEY)
  return (saved as TableDensity) ?? defaultDensity
}
