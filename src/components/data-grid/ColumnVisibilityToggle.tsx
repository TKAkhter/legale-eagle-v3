import { useState } from "react"
import {
  IconButton,
  Popover,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Divider,
  Button,
} from "@mui/material"
import ViewColumnIcon from "@mui/icons-material/ViewColumn"
import type { ColumnDef } from "./types"

interface Props {
  columns: ColumnDef[]
  queryKey: string
  onChange: (value: Set<string>) => void
}

function storageKey(queryKey: string) {
  return `le-cols-${queryKey}`
}

function loadColumns(
  queryKey: string,
  columns: ColumnDef[],
): Set<string> {
  try {
    const saved = localStorage.getItem(storageKey(queryKey))

    if (saved) {
      const parsed = JSON.parse(saved)

      if (Array.isArray(parsed)) {
        const validFields = new Set(
          columns.map(column => String(column.field)),
        )

        const savedFields = parsed
          .map(String)
          .filter(field => validFields.has(field))

        // Don't allow an empty visibility model.
        if (savedFields.length > 0) {
          return new Set(savedFields)
        }
      }
    }
  } catch {
    // Ignore invalid localStorage data.
  }

  return new Set(
    columns.map(column => String(column.field)),
  )
}

export function ColumnVisibilityToggle({
  columns,
  queryKey,
  onChange,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const [visible, setVisible] = useState<Set<string>>(() =>
    loadColumns(queryKey, columns),
  )

  function toggle(field: string) {
    const next = new Set(visible)

    if (next.has(field)) {
      // Keep at least one column visible.
      if (next.size <= 1) {
        return
      }

      next.delete(field)
    } else {
      next.add(field)
    }

    setVisible(next)

    localStorage.setItem(
      storageKey(queryKey),
      JSON.stringify([...next]),
    )

    // Notify parent only because the user changed visibility.
    onChange(new Set(next))
  }

  function showAll() {
    const all = new Set(
      columns.map(column => String(column.field)),
    )

    setVisible(all)

    localStorage.setItem(
      storageKey(queryKey),
      JSON.stringify([...all]),
    )

    onChange(new Set(all))
  }

  const hidden = columns.length - visible.size

  return (
    <>
      <Tooltip
        title={
          hidden > 0
            ? `${hidden} column${hidden > 1 ? "s" : ""} hidden`
            : "Columns"
        }
      >
        <IconButton
          size="small"
          onClick={event => setAnchor(event.currentTarget)}
          color={hidden > 0 ? "primary" : "default"}
          aria-label="Column visibility"
          aria-haspopup="true"
          aria-expanded={Boolean(anchor)}
        >
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPopover-paper": {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: 4,
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Columns
          </Typography>

          {hidden > 0 && (
            <Button
              size="small"
              sx={{ fontSize: 11, py: 0 }}
              onClick={showAll}
            >
              Show all
            </Button>
          )}
        </Box>

        <Divider />

        <Box
          sx={{
            py: 0.5,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {columns.map(column => {
            const field = String(column.field)
            const checked = visible.has(field)

            return (
              <FormControlLabel
                key={field}
                label={
                  <Typography variant="body2">
                    {column.header}
                  </Typography>
                }
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={() => toggle(field)}
                    disabled={visible.size === 1 && checked}
                  />
                }
                sx={{
                  display: "flex",
                  mx: 0,
                  px: 1.5,
                  py: 0.25,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              />
            )
          })}
        </Box>
      </Popover>
    </>
  )
}
