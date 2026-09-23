/**
 * GlobalSearch — matches old LMS navbar search.
 * POST /api/util/global/search with { searchKey }, groups Matter + Client results.
 */
import { useMemo, useRef, useState } from "react"
import {
  Autocomplete, Box, CircularProgress, TextField, Typography, lighten, darken,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { useNavigate } from "react-router-dom"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { matters as staticMatters, clients as staticClients } from "@/data/static"

interface SearchOption {
  type: "Matter" | "Client"
  idWithType: string
  label: string
  matterId?: string
  clientId?: string
  title?: string
  companyName?: string
  firstName?: string
  clientType?: string
}

async function fetchGlobalSearch(searchKey: string): Promise<SearchOption[]> {
  if (!searchKey.trim()) return []

  if (env.USE_STATIC_DATA) {
    const q = searchKey.toLowerCase()
    const matters = (staticMatters as { id?: string; matterId?: string; title?: string }[])
      .filter(m => (m.title ?? "").toLowerCase().includes(q))
      .slice(0, 8)
      .map(m => ({
        type: "Matter" as const,
        idWithType: `M-${m.matterId ?? m.id}`,
        label: m.title ?? "Matter",
        matterId: m.matterId ?? m.id,
        title: m.title,
      }))
    const clients = (staticClients as { id?: string; companyName?: string; firstName?: string; lastName?: string }[])
      .filter(c => `${c.companyName ?? ""} ${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map(c => ({
        type: "Client" as const,
        idWithType: `C-${c.id}`,
        label: c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Client",
        clientId: c.id,
        companyName: c.companyName,
        firstName: c.firstName,
      }))
    return [...matters, ...clients]
  }

  const res = await axiosClient.post("/api/util/global/search", { searchKey })
  const data = res.data?.data ?? res.data ?? {}
  const matterResults = Array.isArray(data.matterResults) ? data.matterResults : []
  const clientResults = Array.isArray(data.clientResults) ? data.clientResults : []

  const matters: SearchOption[] = matterResults.map((item: Record<string, string>) => ({
    ...item,
    type: "Matter" as const,
    idWithType: `M-${item.matterId}`,
    label: item.title || "Matter",
  }))

  const clients: SearchOption[] = clientResults.map((item: Record<string, string>) => {
    const label = item.clientType === "COMPANY"
      ? (item.companyName || "Client")
      : (item.firstName || item.companyName || "Client")
    return {
      ...item,
      type: "Client" as const,
      idWithType: `C-${item.clientId ?? item.id}`,
      label,
    }
  })

  return [...matters, ...clients]
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const grouped = useMemo(() => options, [options])

  function scheduleSearch(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value.trim()) {
      setOptions([])
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      fetchGlobalSearch(value)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false))
    }, 200)
  }

  function handleSelect(option: SearchOption | null) {
    if (!option) return
    if (option.type === "Client") {
      const id = option.clientId ?? option.idWithType.slice(2)
      navigate(`/clients/${id}`)
    } else {
      const id = option.matterId ?? option.idWithType.slice(2)
      navigate(`/matters/${id}`)
    }
    setInputValue("")
    setOptions([])
  }

  return (
    <Autocomplete
      size="small"
      sx={{ width: { xs: 160, sm: 260, md: 300 }, flexShrink: 0 }}
      options={grouped}
      loading={loading}
      inputValue={inputValue}
      value={null}
      filterOptions={(x) => x}
      groupBy={(o) => o.type}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.idWithType === b.idWithType}
      noOptionsText={inputValue ? "No options" : "Type to search"}
      onChange={(_, value) => handleSelect(value)}
      onInputChange={(_, value, reason) => {
        if (reason === "reset") return
        setInputValue(value)
        scheduleSearch(value)
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search"
          variant="outlined"
          slotProps={{
            input: {
              ...params.slotProps?.input,
              startAdornment: (
                <>
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled", ml: 0.5, mr: 0.5 }} />
                  {(params.slotProps?.input as { startAdornment?: React.ReactNode } | undefined)?.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={14} /> : null}
                  {(params.slotProps?.input as { endAdornment?: React.ReactNode } | undefined)?.endAdornment}
                </>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.default",
              borderRadius: 1.5,
              fontSize: 13,
              height: 36,
            },
          }}
        />
      )}
      renderGroup={(params) => (
        <li key={params.key}>
          <Box
            sx={(theme) => ({
              position: "sticky",
              top: -8,
              px: 1.25,
              py: 0.5,
              fontSize: 12,
              fontWeight: 600,
              color: "primary.main",
              bgcolor: theme.palette.mode === "light"
                ? lighten(theme.palette.primary.light, 0.85)
                : darken(theme.palette.primary.main, 0.8),
            })}
          >
            {params.group}
          </Box>
          <Box component="ul" sx={{ p: 0, m: 0 }}>{params.children}</Box>
        </li>
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.idWithType}>
          <Typography variant="body2">{option.label}</Typography>
        </Box>
      )}
    />
  )
}
