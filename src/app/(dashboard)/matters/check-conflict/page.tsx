import { useState } from 'react'
import { Box, Typography, Paper, Button, Alert, Chip, CircularProgress, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { axiosClient } from '@lib/api/axios'

interface CheckEntry { name: string; phone: string; email: string; partyOpposing: string }
interface ConflictResult { name?: string; conflictStatus?: string; existingClient?: boolean; existingMatter?: string; existingLead?: boolean }

const EMPTY = (): CheckEntry => ({ name: '', phone: '', email: '', partyOpposing: '' })

const inputSx: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 6,
  fontSize: 14, outline: 'none', fontFamily: 'IBM Plex Sans, system-ui, sans-serif', width: '100%',
}

export default function ConflictCheckPage() {
  const [entries, setEntries] = useState<CheckEntry[]>([EMPTY()])
  const [results, setResults] = useState<ConflictResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(idx: number, field: keyof CheckEntry, value: string) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  async function runCheck() {
    setLoading(true); setError(''); setResults(null)
    try {
      const payload = { conflictCheckDTOList: entries.filter(e => e.name || e.phone || e.email).map(e => ({ ...e })) }
      const res = await axiosClient.post('/api/conflict/check/multiple/mini/v2', payload)
      setResults(res.data?.data ?? res.data ?? [])
    } catch { setError('Conflict check failed. Please try again.') }
    finally { setLoading(false) }
  }

  const hasConflict = results?.some(r => r.conflictStatus === 'Conflicted')

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Conflict Check</Typography>
        <Typography variant="body2" color="text.secondary">Check parties against existing clients and matters before opening a new matter.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px', gap: 1.5, mb: 1.5 }}>
          {['Full Name', 'Phone', 'Email', 'Party Opposing', ''].map((h, i) => (
            <Typography key={i} variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
          ))}
        </Box>
        {entries.map((entry, idx) => (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px', gap: 1.5, mb: 1 }}>
            <input placeholder="Full name *" value={entry.name}          onChange={e => update(idx, 'name', e.target.value)}          style={inputSx} />
            <input placeholder="Phone"       value={entry.phone}         onChange={e => update(idx, 'phone', e.target.value)}         style={inputSx} />
            <input placeholder="Email"       value={entry.email}         onChange={e => update(idx, 'email', e.target.value)}         style={inputSx} />
            <input placeholder="Party opp."  value={entry.partyOpposing} onChange={e => update(idx, 'partyOpposing', e.target.value)} style={inputSx} />
            <IconButton size="small" onClick={() => setEntries(p => p.filter((_, i) => i !== idx))} disabled={entries.length === 1}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setEntries(p => [...p, EMPTY()])}>Add party</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={runCheck} disabled={loading}>
            {loading ? 'Checking…' : 'Run Check'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {results && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
            bgcolor: hasConflict ? '#FEF2F2' : '#F0FDF4', borderBottom: '1px solid', borderColor: 'divider' }}>
            {hasConflict
              ? <><ErrorIcon color="error" /><Typography sx={{ fontWeight: 600, color: 'error.main' }}>Conflict detected</Typography></>
              : <><CheckCircleIcon color="success" /><Typography sx={{ fontWeight: 600, color: 'success.main' }}>No conflicts found</Typography></>
            }
          </Box>
          {results.map((r, i) => (
            <Box key={i} sx={{ p: 2.5, borderBottom: i < results.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 600, flex: 1 }}>{r.name ?? entries[i]?.name ?? `Party ${i + 1}`}</Typography>
                <Chip size="small" label={r.conflictStatus ?? 'No Conflict'}
                  color={r.conflictStatus === 'Conflicted' ? 'error' : 'success'} variant="outlined" />
              </Box>
              {r.existingClient  && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>⚠ Existing client on record</Typography>}
              {r.existingMatter  && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>⚠ Related matter: {r.existingMatter}</Typography>}
              {r.existingLead    && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>⚠ Existing lead on record</Typography>}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  )
}
