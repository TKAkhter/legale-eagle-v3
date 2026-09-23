/**
 * DashboardCustomiser.tsx — widget visibility and order control panel.
 *
 * Opens as a slide-in drawer from the right.
 * Shows all available widgets with:
 *   - Toggle switch to show/hide
 *   - Up/Down arrows to reorder
 *
 * Changes are saved to localStorage immediately via dashboardStore.
 */
import {
  Drawer, Box, Typography, Switch, IconButton,
  Tooltip, Divider, Button, List, ListItem, ListItemText,
} from "@mui/material"
import CloseIcon    from "@mui/icons-material/Close"
import ArrowUpIcon  from "@mui/icons-material/KeyboardArrowUp"
import ArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import RefreshIcon  from "@mui/icons-material/Refresh"
import { useDashboardStore } from "@lib/store/dashboardStore"
import { logger } from "@/lib/logger"

interface Props {
  open:    boolean
  onClose: () => void
}

export function DashboardCustomiser({ open, onClose }: Props) {
  const { widgets, toggleWidget, moveUp, moveDown, resetLayout } = useDashboardStore()
  const sorted = [...widgets].sort((a, b) => a.order - b.order)

  function handleToggle(id: string) {
    logger.debug("DashboardCustomiser", `Toggling widget: ${id}`)
    toggleWidget(id)
  }

  function handleReset() {
    logger.info("DashboardCustomiser", "Resetting dashboard layout")
    resetLayout()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 320, p: 0 } } }}
    >
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid", borderColor: "divider",
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Customise Dashboard
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Instructions */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "action.hover" }}>
        <Typography variant="caption" color="text.secondary">
          Toggle widgets on/off and reorder them. Changes save automatically.
        </Typography>
      </Box>

      <Divider />

      {/* Widget list */}
      <List disablePadding sx={{ flex: 1, overflowY: "auto" }}>
        {sorted.map((widget, idx) => (
          <ListItem
            key={widget.id}
            divider
            secondaryAction={
              <Box sx={{ display: "flex", gap: 0.25 }}>
                <Tooltip title="Move up">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => moveUp(widget.id)}
                      disabled={idx === 0}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => moveDown(widget.id)}
                      disabled={idx === sorted.length - 1}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            }
            sx={{ pr: 10 }}
          >
            <Switch
              size="small"
              checked={widget.visible}
              onChange={() => handleToggle(widget.id)}
              sx={{ mr: 1.5 }}
            />
            <ListItemText
              primary={widget.label}
              secondary={widget.size === "full" ? "Full width" : "Half width"}
              slotProps={{
                primary:   { style: { fontSize: 13, fontWeight: widget.visible ? 600 : 400 } },
                secondary: { style: { fontSize: 11 } },
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          size="small"
        >
          Reset to default layout
        </Button>
      </Box>
    </Drawer>
  )
}
