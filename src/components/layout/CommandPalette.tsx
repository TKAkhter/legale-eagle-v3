/**
 * CommandPalette.tsx — global Ctrl+K command palette.
 *
 * Features:
 *   - Opens with Ctrl+K (or Cmd+K on Mac)
 *   - Searches across Leads, Clients, Matters simultaneously
 *   - Keyboard navigation: ↑↓ to move, Enter to select, Esc to close
 *   - Groups results by entity type with colour badges
 *   - Static data mode: searches src/data/static.ts
 *   - Shows recent pages when query is empty
 *
 * Usage: mount once in MainLayout, opens from anywhere.
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Dialog, Box, InputBase, Typography, Divider,
  CircularProgress, Paper,
} from "@mui/material"
import SearchIcon       from "@mui/icons-material/Search"
import TrendingUpIcon   from "@mui/icons-material/TrendingUp"
import PeopleIcon       from "@mui/icons-material/People"
import GavelIcon        from "@mui/icons-material/Gavel"
import HistoryIcon      from "@mui/icons-material/History"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { useDebounce }  from "@hooks/useDebounce"
import { axiosClient }  from "@lib/api/axios"
import { env }          from "@/config/env"
import { logger }       from "@/lib/logger"
import { leads as staticLeads, clients as staticClients, matters as staticMatters } from "@/data/static"

// Entity type config — colour and icon per result type
const ENTITY = {
  Lead:   { color: "#00B4A6", bg: "#00B4A620", icon: <TrendingUpIcon sx={{ fontSize: 14 }} /> },
  Client: { color: "#0F3C6E", bg: "#0F3C6E20", icon: <PeopleIcon     sx={{ fontSize: 14 }} /> },
  Matter: { color: "#365E92", bg: "#365E9220", icon: <GavelIcon      sx={{ fontSize: 14 }} /> },
}

interface Result {
  id:       string
  label:    string
  subLabel?: string
  path:     string
  type:     keyof typeof ENTITY
}

// Recent pages stored in sessionStorage
const RECENT_KEY = "le-recent-pages"
interface RecentPage { label: string; path: string }

function getRecent(): RecentPage[] {
  try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]") } catch { return [] }
}
function addRecent(page: RecentPage) {
  const pages = [page, ...getRecent().filter(p => p.path !== page.path)].slice(0, 5)
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(pages))
}

/** Perform search — static data or real API */
async function search(query: string): Promise<Result[]> {
  const q = query.toLowerCase()
  const results: Result[] = []

  if (env.USE_STATIC_DATA) {
    // Search static data
    const sLeads = (staticLeads as unknown as Record<string,string>[])
      .filter(l => `${l.firstName} ${l.lastName} ${l.companyName}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(l => ({
        id: l.id, type: "Lead" as const, path: `/leads/${l.id}`,
        label: `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || l.companyName || "Lead",
        subLabel: l.currentStatus,
      }))

    const sClients = (staticClients as unknown as Record<string,string>[])
      .filter(c => `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({
        id: c.id, type: "Client" as const, path: `/clients/${c.id}`,
        label: c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Client",
      }))

    const sMatters = (staticMatters as unknown as Record<string,string>[])
      .filter(m => `${m.title} ${m.description}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map(m => ({
        id: m.id, type: "Matter" as const, path: `/matters/${m.matterId ?? m.id}`,
        label: m.title || "Matter", subLabel: (m.clientMini as unknown as Record<string,string>)?.companyName,
      }))

    return [...sLeads, ...sClients, ...sMatters]
  }

  // Real API — parallel search
  const [leadsRes, clientsRes, mattersRes] = await Promise.allSettled([
    axiosClient.get("/api/leads/list/filter",   { params: { firstName: query, pageNumber: 0, pageSize: 4 } }),
    axiosClient.get("/api/client/get/short-info",{ params: { clientName: query, pageNumber: 0, pageSize: 4 } }),
    axiosClient.get("/api/matter/get/short-info",{ params: { searchText: query, pageNumber: 0, pageSize: 4 } }),
  ])

  if (leadsRes.status === "fulfilled") {
    const leads = leadsRes.value.data?.data?.content ?? leadsRes.value.data?.content ?? []
    leads.forEach((l: Record<string,string>) => results.push({
      id: l.id, type: "Lead", path: `/leads/${l.id}`,
      label: `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || l.companyName || "Lead",
      subLabel: l.currentStatus,
    }))
  }
  if (clientsRes.status === "fulfilled") {
    const clients = clientsRes.value.data?.data?.content ?? clientsRes.value.data?.content ?? []
    clients.forEach((c: Record<string,string>) => results.push({
      id: c.id, type: "Client", path: `/clients/${c.id}`,
      label: c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Client",
    }))
  }
  if (mattersRes.status === "fulfilled") {
    const matters = mattersRes.value.data?.data?.content ?? mattersRes.value.data?.content ?? []
    matters.forEach((m: Record<string,string>) => results.push({
      id: m.id, type: "Matter", path: `/matters/${m.id}`,
      label: m.title || "Matter",
    }))
  }

  return results
}

export function CommandPalette() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const inputRef  = useRef<HTMLInputElement>(null)

  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const [recent,  setRecent]  = useState<RecentPage[]>([])

  const debouncedQuery = useDebounce(query, 300)

  // Track current page for recent history
  useEffect(() => {
    const label = document.title.split(" — ")[0] || location.pathname
    addRecent({ label, path: location.pathname })
  }, [location.pathname])

  // Open/close with Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) {
            logger.debug("CommandPalette", "Opened via Ctrl+K")
            setRecent(getRecent())
            setQuery("")
            setResults([])
            setCursor(0)
          }
          return !prev
        })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    setCursor(0)
    logger.debug("CommandPalette", `Searching: "${debouncedQuery}"`)
    search(debouncedQuery)
      .then(r => { setResults(r); logger.debug("CommandPalette", `${r.length} results`) })
      .catch(e => logger.error("CommandPalette", "Search failed", e))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Keyboard navigation within results
  const allItems = results.length > 0 ? results : recent.map(r => ({ ...r, type: "Recent" as const, id: r.path, subLabel: undefined }))

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === "Enter"  && allItems[cursor]) { selectResult(allItems[cursor] as Result) }
    if (e.key === "Escape")    { handleClose() }
  }, [cursor, allItems]) // eslint-disable-line

  function selectResult(r: Result | { path: string; label: string }) {
    logger.info("CommandPalette", `Navigating to ${r.path}`)
    navigate(r.path)
    handleClose()
  }

  function handleClose() {
    setOpen(false)
    setQuery("")
    setResults([])
    setCursor(0)
  }

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {} as Record<string, Result[]>)

  const showRecent = !query && recent.length > 0

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          overflow: "hidden",
          position: "fixed",
          top: "15%",
          m: 0,
        },
        "& .MuiBackdrop-root": { backdropFilter: "blur(2px)" },
      }}
    >
      {/* Search input */}
      <Box sx={{
        display: "flex", alignItems: "center", px: 2, py: 1.5,
        borderBottom: "1px solid", borderColor: "divider",
      }}>
        <SearchIcon sx={{ color: "text.disabled", mr: 1.5, fontSize: 20 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, clients, matters…"
          fullWidth
          sx={{ fontSize: 15 }}
          inputProps={{ "aria-label": "Command palette search" }}
        />
        {loading && <CircularProgress size={16} sx={{ flexShrink: 0 }} />}
        <Paper
          variant="outlined"
          sx={{ px: 0.75, py: 0.25, borderRadius: 1, ml: 1, flexShrink: 0 }}
        >
          <Typography variant="caption" sx={{ fontSize: 10, color: "text.disabled", fontFamily: "monospace" }}>
            Esc
          </Typography>
        </Paper>
      </Box>

      {/* Results */}
      <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
        {/* Empty query — show recent */}
        {showRecent && (
          <Box>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                Recent
              </Typography>
            </Box>
            {recent.map((page, i) => (
              <Box
                key={page.path}
                onMouseDown={() => selectResult(page as Result)}
                sx={{
                  px: 2, py: 1.25, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5,
                  bgcolor: i === cursor ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                  transition: "background-color 100ms",
                }}
              >
                <HistoryIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>{page.label}</Typography>
                <Typography variant="caption" color="text.disabled">{page.path}</Typography>
                <ChevronRightIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              </Box>
            ))}
          </Box>
        )}

        {/* Search results — grouped by type */}
        {results.length > 0 && Object.entries(grouped).map(([type, items], gi) => {
          const config = ENTITY[type as keyof typeof ENTITY]
          const globalOffset = Object.entries(grouped).slice(0, gi).reduce((s, [,v]) => s + v.length, 0)
          return (
            <Box key={type}>
              <Divider />
              <Box sx={{ px: 2, py: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ color: config?.color }}>{config?.icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                  {type}s
                </Typography>
              </Box>
              {items.map((r, i) => {
                const idx = globalOffset + i
                return (
                  <Box
                    key={r.id}
                    onMouseDown={() => selectResult(r)}
                    sx={{
                      px: 2, py: 1.25, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5,
                      bgcolor: idx === cursor ? "action.selected" : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                      transition: "background-color 100ms",
                    }}
                  >
                    {/* Entity type badge */}
                    <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.75, bgcolor: config?.bg, flexShrink: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: config?.color, fontSize: 10 }}>
                        {type}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{r.label}</Typography>
                      {r.subLabel && (
                        <Typography variant="caption" color="text.secondary" noWrap>{r.subLabel}</Typography>
                      )}
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }} />
                  </Box>
                )
              })}
            </Box>
          )
        })}

        {/* No results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No results for "<strong>{query}</strong>"
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
              Try searching for a name, company, or matter number
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer hint */}
      <Divider />
      <Box sx={{ px: 2, py: 1, display: "flex", gap: 2 }}>
        {[["↑↓", "navigate"], ["↵", "select"], ["Esc", "close"]].map(([key, label]) => (
          <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Paper variant="outlined" sx={{ px: 0.75, py: 0.125, borderRadius: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: 10, fontFamily: "monospace", color: "text.secondary" }}>{key}</Typography>
            </Paper>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Dialog>
  )
}
