import { env } from '@/config/env'
import { Box, Typography, Paper, Chip, Skeleton } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { StatusBadge } from '@components/ui/StatusBadge'
import { formatDate } from '@lib/utils/formatDate'

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const { data:task, isLoading } = useQuery({
    queryKey:['tasks','detail',taskId],
    queryFn: async()=>{ const r=await axiosClient.get('/api/task/get/full/task',{params:{taskId}}); return r.data?.data??r.data },
    enabled:!!taskId
  })
  if (isLoading) return <Skeleton variant="rounded" height={140} />
  return (
    <Box>
      <Paper variant="outlined" sx={{ p:3, mb:3, borderRadius:2 }}>
        <Typography variant="h6" sx={{ fontWeight:600, mb:1 }}>{task?.taskName??'Task'}</Typography>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
          <StatusBadge status={task?.taskStatus??'Pending'} />
          <Chip size="small" label={task?.priority??'Normal'} variant="outlined" />
          <Chip size="small" label={`Deadline: ${formatDate(task?.taskDeadLine)}`} variant="outlined" />
        </Box>
        {task?.taskDescription && <Typography variant="body2" sx={{ mt:2 }} color="text.secondary">{task.taskDescription}</Typography>}
      </Paper>
    </Box>
  )
}
