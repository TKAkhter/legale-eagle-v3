import { Box, CircularProgress, Typography } from "@mui/material"

/** Centered loading state for panels / detail sections waiting on API. */
export function PanelLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  )
}

/** Absolute overlay for a relative parent while an API call is in flight. */
export function LoadingOverlay({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "rgba(255,255,255,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        borderRadius: "inherit",
        backdropFilter: "blur(1px)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <CircularProgress size={22} />
        {label && <Typography variant="body2">{label}</Typography>}
      </Box>
    </Box>
  )
}
