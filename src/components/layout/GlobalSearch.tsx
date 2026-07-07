import { useState, useRef, useEffect } from 'react'
import { Box, InputBase, Paper, Typography, Divider, CircularProgress } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useNavigate } from 'react-router-dom'
import { axiosClient } from '@lib/api/axios'
import { useDebounce } from '@hooks/useDebounce'

interface Result { id: string; label: string; subLabel?: string; path: string; type: string }

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return }
    setLoading(true)
    Promise.allSettled([
      axiosClient.get('/api/leads/list/filter', { params: { firstName: debouncedQuery, pageNumber: 0, pageSize: 5 } }),
      axiosClient.get('/api/client/get/short-info',  { params: { clientName: debouncedQuery, pageNumber: 0, pageSize: 5 } }),
      axiosClient.get('/api/matter/get/short-info',  { params: { searchText: debouncedQuery, pageNumber: 0, pageSize: 5 } }),
    ]).then(([leadsRes, clientsRes, mattersRes]) => {
      const out: Result[] = []
      const leads   = leadsRes.status   === 'fulfilled' ? (leadsRes.value.data?.data?.content   ?? leadsRes.value.data?.content   ?? []) : []
      const clients = clientsRes.status === 'fulfilled' ? (clientsRes.value.data?.data?.content ?? clientsRes.value.data?.content ?? []) : []
      const matters = mattersRes.status === 'fulfilled' ? (mattersRes.value.data?.data?.content ?? mattersRes.value.data?.content ?? []) : []

      leads.forEach((l: Record<string,string>) => out.push({ id:l.id, type:'Lead', path:`/leads/${l.id}`, label:`${l.firstName??''} ${l.lastName??''}`.trim()||l.companyName||'Lead', subLabel: l.currentStatus }))
      clients.forEach((c: Record<string,string>) => out.push({ id:c.id, type:'Client', path:`/clients/${c.id}`, label:c.companyName||`${c.firstName??''} ${c.lastName??''}`.trim()||'Client' }))
      matters.forEach((m: Record<string,string>) => out.push({ id:m.id, type:'Matter', path:`/matters/${m.id}`, label:m.title||'Matter', subLabel:m.matterSequence }))

      setResults(out.slice(0, 12))
    }).finally(() => setLoading(false))
  }, [debouncedQuery])

  function handleSelect(result: Result) {
    navigate(result.path)
    setOpen(false); setQuery('')
  }

  const TYPE_COLOR: Record<string, string> = { Lead: '#00B4A6', Client: '#0F3C6E', Matter: '#365E92' }

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper variant="outlined" sx={{ display:'flex', alignItems:'center', px:1.5, py:0.5, borderRadius:1.5, minWidth:220, bgcolor:'background.default', cursor:'text' }}
        onClick={() => { inputRef.current?.focus(); setOpen(true) }}>
        <SearchIcon sx={{ fontSize:16, color:'text.disabled', mr:1 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder="Search… (⌘K)"
          sx={{ fontSize:13, flex:1 }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(()=>setOpen(false), 150)}
        />
        {loading && <CircularProgress size={14} />}
      </Paper>

      {open && (query.length >= 2) && (
        <Paper elevation={8} sx={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, borderRadius:2, zIndex:1400, overflow:'hidden', minWidth:360 }}>
          {results.length === 0 && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ p:2 }}>No results for "{query}"</Typography>
          )}
          {results.map((r, i) => (
            <Box key={r.id} onMouseDown={() => handleSelect(r)}
              sx={{ px:2, py:1.25, cursor:'pointer', display:'flex', alignItems:'center', gap:1.5,
                borderBottom: i<results.length-1 ? '1px solid' : 'none', borderColor:'divider',
                '&:hover':{ bgcolor:'action.hover' } }}>
              <Box sx={{ px:0.75, py:0.25, borderRadius:0.75, bgcolor: TYPE_COLOR[r.type]+'22', flexShrink:0 }}>
                <Typography variant="caption" sx={{ fontWeight:600, color:TYPE_COLOR[r.type], fontSize:10 }}>{r.type}</Typography>
              </Box>
              <Box sx={{ flex:1, minWidth:0 }}>
                <Typography variant="body2" sx={{ fontWeight:500 }} noWrap>{r.label}</Typography>
                {r.subLabel && <Typography variant="caption" color="text.secondary">{r.subLabel}</Typography>}
              </Box>
            </Box>
          ))}
          {results.length > 0 && (
            <Box sx={{ px:2, py:1, bgcolor:'action.hover' }}>
              <Typography variant="caption" color="text.disabled">↑↓ navigate · Enter select · Esc close</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}
