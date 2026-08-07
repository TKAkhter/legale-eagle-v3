/**
 * GlobalSearch.tsx — search trigger button in the toolbar.
 *
 * Shows a "Search… ⌘K" pill that opens the CommandPalette on click or Ctrl+K.
 * The actual search logic lives in CommandPalette.tsx.
 */
import { Box, InputBase, Paper, useMediaQuery } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"

export function GlobalSearch() {
  const isWide = useMediaQuery("(min-width:768px)")

  function openPalette() {
    // Dispatch Ctrl+K synthetic event to open CommandPalette
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "k", bubbles: true }))
  }

  return (
    <Paper
      variant="outlined"
      onClick={openPalette}
      sx={{
        display: "flex",
        alignItems: "center",
        px: 1.5,
        py: 0.5,
        borderRadius: 1.5,
        minWidth: isWide ? 200 : 36,
        maxWidth: isWide ? 260 : 36,
        bgcolor: "background.default",
        cursor: "text",
        transition: "min-width 200ms ease",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <SearchIcon sx={{ fontSize: 16, color: "text.disabled", mr: isWide ? 1 : 0 }} />
      {isWide && (
        <>
          <InputBase
            placeholder="Search…"
            readOnly
            sx={{ fontSize: 13, flex: 1, cursor: "text", pointerEvents: "none" }}
          />
          <Box
            component="kbd"
            sx={{
              fontSize: 10,
              color: "text.disabled",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 0.75,
              px: 0.75,
              py: 0.125,
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            ⌘K
          </Box>
        </>
      )}
    </Paper>
  )
}
