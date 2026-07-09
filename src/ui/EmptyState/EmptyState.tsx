import { Box, Typography, Button } from "@mui/material"
import InboxIcon from "@mui/icons-material/Inbox"
import type { ReactNode } from "react"
interface Props { icon?: ReactNode; title?: string; description?: string; action?: { label: string; onClick: () => void } }
export function EmptyState({ icon, title = "No data", description, action }: Props) {
  return (
    <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box sx={{ color: "text.disabled", mb: 0.5 }}>{icon ?? <InboxIcon sx={{ fontSize: 40 }} />}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary" }}>{title}</Typography>
      {description && <Typography variant="body2" sx={{ color: "text.disabled", textAlign: "center", maxWidth: 320 }}>{description}</Typography>}
      {action && <Button size="small" variant="outlined" onClick={action.onClick} sx={{ mt: 1 }}>{action.label}</Button>}
    </Box>
  )
}
