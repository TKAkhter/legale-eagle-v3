import { Box, Typography, type SxProps, type Theme } from "@mui/material"
import type { ReactNode } from "react"
interface Props { title: string; description?: string; action?: ReactNode; children: ReactNode; sx?: SxProps<Theme> }
export function Page({ title, description, action, children, sx }: Props) {
  return (
    <Box sx={{ ...sx }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: description ? 1 : 2.5 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</Typography>{description && <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>{description}</Typography>}</Box>
        {action && <Box sx={{ flexShrink: 0, ml: 2 }}>{action}</Box>}
      </Box>
      {children}
    </Box>
  )
}
