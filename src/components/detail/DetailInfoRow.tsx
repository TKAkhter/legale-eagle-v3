import { Box, Typography } from "@mui/material"
import type { ReactNode } from "react"

/** Shared label/value row used across lead / matter / client detail homes. */
export function DetailInfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25, wordBreak: "break-word" }}>
        {value == null || value === "" ? "—" : value}
      </Typography>
    </Box>
  )
}
