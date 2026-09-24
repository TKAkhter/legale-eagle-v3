import { Link as RouterLink } from "react-router-dom"
import { Alert, Box, Button, Typography } from "@mui/material"
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined"

/** Documents tab — deep-links into OneDrive file manager scoped by entity. */
export function DocumentsTab({
  relatedTo,
  relatedToId,
  label,
}: {
  relatedTo: "MATTER" | "CLIENT" | "LEAD"
  relatedToId: string
  label?: string
}) {
  const href = `/integrations/onedrive?relatedTo=${relatedTo}&relatedToId=${encodeURIComponent(relatedToId)}`
  return (
    <Box sx={{ py: 2 }}>
      <Alert severity="info" icon={<CloudOutlinedIcon />} sx={{ mb: 2 }}>
        Documents for this {label ?? relatedTo.toLowerCase()} are managed in OneDrive.
      </Alert>
      <Button component={RouterLink} to={href} variant="contained" startIcon={<CloudOutlinedIcon />}>
        Open Documents
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
        Folder scope: {relatedTo} / {relatedToId}
      </Typography>
    </Box>
  )
}
