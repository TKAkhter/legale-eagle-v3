import { Box, Typography, Button } from "@mui/material"
import InboxIcon from "@mui/icons-material/Inbox"
import SearchOffIcon from "@mui/icons-material/SearchOff"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined"
import type { ReactNode } from "react"

type Variant = "empty" | "search" | "error"

interface Props {
  variant?:    Variant
  title?:      string
  description?:string
  icon?:       ReactNode
  action?:     { label: string; onClick: () => void }
}

const DEFAULTS: Record<Variant, { icon: ReactNode; title: string; description: string }> = {
  empty:  { icon: <InboxIcon sx={{ fontSize: 48 }} />, title: "No records found", description: "There is nothing here yet." },
  search: { icon: <SearchOffIcon sx={{ fontSize: 48 }} />, title: "No results", description: "Try changing your search or filters." },
  error:  { icon: <ErrorOutlineIcon sx={{ fontSize: 48 }} />, title: "Something went wrong", description: "Failed to load data. Please try again." },
}

export function EmptyState({ variant = "empty", title, description, icon, action }: Props) {
  const defaults = DEFAULTS[variant]
  return (
    <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, textAlign: "center" }}>
      <Box sx={{ color: "text.disabled", mb: 0.5 }}>{icon ?? defaults.icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.secondary" }}>
        {title ?? defaults.title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.disabled", maxWidth: 360 }}>
        {description ?? defaults.description}
      </Typography>
      {action && (
        <Button size="small" variant="outlined" onClick={action.onClick} sx={{ mt: 0.5 }}>
          {action.label}
        </Button>
      )}
    </Box>
  )
}
