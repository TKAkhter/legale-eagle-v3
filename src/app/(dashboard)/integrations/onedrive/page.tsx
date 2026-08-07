import { Box, Typography, Paper, Button, Alert, Chip } from '@mui/material'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { env } from '@/config/env'

export default function OneDrivePage() {
  const { data: folders, isLoading } = useQuery({
    queryKey: ['onedrive', 'folders'],
    queryFn: async () => {
      const r = await axiosClient.get('/api/onedrive/folder/get')
      return r.data?.data ?? r.data ?? []
    },
  })

  const isConfigured = Boolean(env.ONEDRIVE_CLIENT_ID || env.AZURE_CLIENT_ID)

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>OneDrive Integration</Typography>

      {!isConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          OneDrive integration requires AZURE_CLIENT_ID or ONEDRIVE_CLIENT_ID to be configured in your .env file.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CloudOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Microsoft OneDrive</Typography>
            <Typography variant="body2" color="text.secondary">
              Files for Leads, Clients, and Matters are automatically organised into OneDrive folders.
            </Typography>
          </Box>
          <Chip size="small" label={isConfigured ? 'Configured' : 'Not configured'} color={isConfigured ? 'success' : 'default'} sx={{ ml: 'auto' }} />
        </Box>
        <Button variant="outlined" startIcon={<OpenInNewIcon />} href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" disabled={!isConfigured}>
          Open Azure Portal
        </Button>
      </Paper>

      {!isLoading && Array.isArray(folders) && folders.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Registered Folders</Typography>
          {(folders as Record<string, unknown>[]).map((f, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">{String(f.folderType ?? '—')} — {String(f.entityName ?? f.entityId ?? '—')}</Typography>
              <Chip size="small" label={String(f.folderId ?? '—')} variant="outlined" />
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  )
}
