import { useState } from 'react'
import { Box, Typography, Paper, Button, Switch, FormControlLabel, Snackbar, Alert, IconButton, Tooltip } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { QK } from '@lib/query/keys'

interface Widget { name: string; seq: number; thumb?: string; visible?: boolean }

export function DashboardSetup() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })

  useQuery({
    queryKey: QK.dashboard.setup(),
    queryFn: async () => {
      const r = await axiosClient.get('/api/dashboard/get/setup')
      const list: Widget[] = r.data?.data ?? r.data ?? []
      setWidgets(list.map((w, i) => ({ ...w, seq: w.seq ?? i })).sort((a, b) => a.seq - b.seq))
      return list
    },
    enabled: open,
  })

  function toggle(name: string) {
    setWidgets(prev => prev.map(w => w.name === name ? { ...w, visible: !(w.visible ?? true) } : w))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setWidgets(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr.map((w, i) => ({ ...w, seq: i }))
    })
  }

  async function save() {
    setSaving(true)
    try {
      await axiosClient.post('/api/dashboard/setup', {
        sequenceList: widgets.map((w, i) => ({ name: w.name, seq: i, thumb: w.thumb ?? '' })),
      })
      qc.invalidateQueries({ queryKey: QK.dashboard.setup() })
      setSnack({ open: true, msg: 'Dashboard layout saved', severity: 'success' })
      setOpen(false)
    } catch {
      setSnack({ open: true, msg: 'Failed to save layout', severity: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <>
      <Tooltip title="Customise dashboard">
        <IconButton size="small" onClick={() => setOpen(v => !v)}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {open && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Customise Widgets</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Layout'}
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {widgets.map((w, i) => (
              <Box key={w.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <DragIndicatorIcon sx={{ color: 'text.disabled', cursor: 'grab', fontSize: 20 }} onClick={() => moveUp(i)} />
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{w.name.replace(/_/g, ' ')}</Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={w.visible ?? true} onChange={() => toggle(w.name)} />}
                  label={<Typography variant="caption">{(w.visible ?? true) ? 'Visible' : 'Hidden'}</Typography>}
                  sx={{ m: 0 }}
                />
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </>
  )
}
