/**
 * FilterPresetsBar.tsx — saved filter preset selector.
 *
 * Shows quick-select buttons above the filter panel.
 * Users can click a preset to instantly apply a common filter set.
 *
 * Presets are defined at the page level and passed to DataGrid via filterPresets prop.
 * Example:
 *   filterPresets={[
 *     { id: "my-open", label: "My Open Leads", filters: { currentStatus: "NEW", lawyerId: currentUserId } },
 *     { id: "followup", label: "Follow Up",    filters: { currentStatus: "FOLLOW_UP" } },
 *   ]}
 */
import { Box, Chip, Typography } from "@mui/material"
import BookmarksIcon from "@mui/icons-material/Bookmarks"
import type { FilterPreset } from "./types"

interface Props {
  presets:         FilterPreset[]
  activePresetId?: string
  onSelect:        (preset: FilterPreset) => void
  onClear:         () => void
}

export function FilterPresetsBar({ presets, activePresetId, onSelect, onClear }: Props) {
  if (!presets.length) return null

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
        <BookmarksIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 500 }}>Presets:</Typography>
      </Box>

      {presets.map(preset => (
        <Chip
          key={preset.id}
          label={preset.label}
          size="small"
          color={activePresetId === preset.id ? "primary" : "default"}
          variant={activePresetId === preset.id ? "filled" : "outlined"}
          onClick={() => {
            if (activePresetId === preset.id) onClear()
            else onSelect(preset)
          }}
          sx={{ fontSize: 11 }}
        />
      ))}

      {activePresetId && (
        <Chip
          label="Clear preset"
          size="small"
          variant="outlined"
          color="error"
          onClick={onClear}
          sx={{ fontSize: 11 }}
        />
      )}
    </Box>
  )
}
