import { Box, Chip, Tooltip, IconButton } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import TimerIcon from '@mui/icons-material/Timer'
import { useEffect } from 'react'
import { useStopwatchStore, formatElapsed } from '@lib/store/stopwatchStore'
import { axiosClient } from '@lib/api/axios'

export function StopwatchWidget() {
  const { status, elapsed, matterId, matterTitle, tick, pause, resume, end } = useStopwatchStore()

  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, tick])

  if (status === 'idle') return null

  const handlePause = async () => {
    await axiosClient.post('/api/activity/stopwatch', null, { params: { activityTimerStatus: 'Pause', matterId } })
    pause()
  }
  const handleResume = async () => {
    await axiosClient.post('/api/activity/stopwatch', null, { params: { activityTimerStatus: 'Resume', matterId } })
    resume()
  }
  const handleEnd = async () => {
    await axiosClient.post('/api/activity/stopwatch', null, { params: { activityTimerStatus: 'End', matterId } })
    end()
  }

  return (
    <Box sx={{ gap: 0.5, display: "flex", alignItems: "center" }}>
      <Tooltip title={matterTitle ?? ''}><Chip icon={<TimerIcon />} label={formatElapsed(elapsed)} size="small" color={status === 'running' ? 'primary' : 'default'} /></Tooltip>
      {status === 'running' ? <IconButton size="small" onClick={handlePause}><PauseIcon fontSize="small" /></IconButton> : <IconButton size="small" onClick={handleResume}><PlayArrowIcon fontSize="small" /></IconButton>}
      <IconButton size="small" onClick={handleEnd}><StopIcon fontSize="small" /></IconButton>
    </Box>
  )
}
