import { Box, Typography, Button } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'
interface Props { title?:string; description?:string; action?:{ label:string; onClick:()=>void }; icon?:React.ReactNode }
export function EmptyState({ title='No records found', description, action, icon }: Props) {
  return (
    <Box sx={{ py: 8, gap: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ fontSize: 64, color: "text.disabled" }}>{icon ?? <InboxIcon fontSize="inherit"/>}</Box>
      <Typography variant="h6" sx={{ fontWeight: 500, color: "text.secondary" }}>{title}</Typography>
      {description && <Typography variant="body2" sx={{ maxWidth: 360, color: "text.disabled", textAlign: "center" }}>{description}</Typography>}
      {action && <Button variant="contained" onClick={action.onClick} sx={{mt:1}}>{action.label}</Button>}
    </Box>
  )
}
