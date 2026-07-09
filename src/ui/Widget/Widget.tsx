import { Paper, Box, Typography, Skeleton, Divider, type SxProps, type Theme } from "@mui/material"
import type { ReactNode } from "react"
interface Props { title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode; loading?: boolean; sx?: SxProps<Theme>; noPadding?: boolean }
export function Widget({ title, subtitle, children, actions, loading, sx, noPadding }: Props) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", ...sx }}>
      {(title || actions) && (<><Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}><Box>{title && <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>}{subtitle && <Typography variant="caption" sx={{ color: "text.secondary" }}>{subtitle}</Typography>}</Box>{actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}</Box><Divider /></>)}
      <Box sx={noPadding ? undefined : { p: 2.5 }}>{loading ? <Skeleton variant="rounded" height={120} /> : children}</Box>
    </Paper>
  )
}
