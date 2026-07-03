import { Box, Typography, Divider } from '@mui/material'
interface Props { title: string; children: React.ReactNode; description?: string }
export function FormSection({ title, children, description }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>{title}</Typography>
      {description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{description}</Typography>}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
    </Box>
  )
}
