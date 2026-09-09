/**
 * SidebarHeader.tsx — logo + brand shown at top of the sidebar.
 *
 * NO hamburger here — the single hamburger lives in Toolbar.tsx.
 * Collapsed state shows icon-only; expanded shows icon + wordmark.
 */
import { Box, Typography } from "@mui/material"
import GavelIcon from "@mui/icons-material/Gavel"

export function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <Box sx={{
      height: 56,
      display: "flex",
      alignItems: "center",
      px: collapsed ? 1.5 : 2,
      gap: 1.25,
      borderBottom: "1px solid",
      borderColor: "divider",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Logo icon — always visible */}
      <Box sx={{
        width: 32, height: 32,
        borderRadius: 1.5,
        bgcolor: "secondary.main",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <GavelIcon sx={{ color: "white", fontSize: 18 }} />
      </Box>

      {/* Wordmark — hidden when collapsed */}
      <Box sx={{
        overflow: "hidden",
        opacity: collapsed ? 0 : 1,
        width: collapsed ? 0 : "auto",
        transition: "opacity 180ms, width 220ms",
        whiteSpace: "nowrap",
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.1 }}>
          LegalEagle
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Legal Management
        </Typography>
      </Box>
    </Box>
  )
}
