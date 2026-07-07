import { useState } from 'react'
import { Box, Paper, Typography, Button, TextField, IconButton, Snackbar, Alert, Skeleton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'

interface Props {
  title: string
  getUrl: string
  addUrl: string
  deleteUrl: string
  nameField: string
  queryKey: string
  extraFields?: { key: string; label: string; type?: string }[]
}

export function LookupManager({ title, getUrl, addUrl, deleteUrl, nameField, queryKey, extraFields = [] }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success'|'error' }>({ open: false, msg: '', severity: 'success' })

  const { data = [], isLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: [queryKey, 'list'],
    queryFn: async () => { const r = await axiosClient.get(getUrl); return r.data?.data ?? r.data ?? [] },
  })

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await axiosClient.post(addUrl, { [nameField]: name.trim(), ...extras })
      qc.invalidateQueries({ queryKey: [queryKey] })
      setName(''); setExtras({})
      setSnack({ open: true, msg: `${title.slice(0,-1)} added`, severity: 'success' })
    } catch { setSnack({ open: true, msg: 'Failed to add', severity: 'error' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: unknown) {
    try {
      await axiosClient.delete(`${deleteUrl}/${id}`)
      qc.invalidateQueries({ queryKey: [queryKey] })
      setSnack({ open: true, msg: 'Deleted', severity: 'success' })
    } catch { setSnack({ open: true, msg: 'Failed to delete', severity: 'error' }) }
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
        <TextField size="small" label={`New ${title.slice(0,-1)} name`} value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
          sx={{ flex: 1 }} />
        {extraFields.map(f => (
          <TextField key={f.key} size="small" label={f.label} type={f.type ?? 'text'}
            value={extras[f.key] ?? ''} onChange={e => setExtras(p => ({ ...p, [f.key]: e.target.value }))}
            sx={{ width: 140 }} />
        ))}
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} disabled={!name.trim() || saving}>
          Add
        </Button>
      </Box>
      {isLoading
        ? [...Array(4)].map((_, i) => <Skeleton key={i} height={52} sx={{ mx: 2 }} />)
        : (data as Record<string, unknown>[]).length === 0
          ? <Typography color="text.secondary" sx={{ p: 3 }}>No {title.toLowerCase()} yet.</Typography>
          : (data as Record<string, unknown>[]).map((item, i) => (
            <Box key={String(item.id ?? i)}
              sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < data.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' } }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(item[nameField] ?? item.name ?? '—')}</Typography>
              <IconButton size="small" onClick={() => handleDelete(item.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
      }
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Paper>
  )
}
