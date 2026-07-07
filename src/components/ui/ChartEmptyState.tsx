import { Box, Typography } from '@mui/material'
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined'

export function ChartEmptyState({ message = 'No data available yet' }: { message?: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1 }}>
      <InsertChartOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
      <Typography variant="body2" color="text.disabled">{message}</Typography>
    </Box>
  )
}
