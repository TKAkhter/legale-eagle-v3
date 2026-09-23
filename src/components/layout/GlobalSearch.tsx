/**
 * GlobalSearch — LMS navbar search parity.
 * POST /api/util/global/search { searchKey } → Matter + Client groups.
 */
import { useEffect, useRef, useState } from "react"
import {
  Autocomplete, Box, CircularProgress, TextField, Typography, lighten, darken,
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { matters as staticMatters, clients as staticClients } from "@/data/static"
import { authApi } from "@/api/auth"

interface SearchOption {
  type: "Matter" | "Client"
  idWithType: string
  title?: string
  companyName?: string
  firstName?: string
  clientType?: string
  matterId?: string
  clientId?: string
}

function optionLabel(option: SearchOption): string {
  if (option.type === "Matter") return option.title || "Matter"
  if (option.clientType === "COMPANY") return option.companyName || "Client"
  return option.firstName || option.companyName || "Client"
}

async function fetchGlobalSearch(searchKey: string): Promise<SearchOption[]> {
  if (!searchKey.trim()) return []

  if (env.USE_STATIC_DATA) {
    const q = searchKey.toLowerCase()
    const matters = (staticMatters as { id?: string; matterId?: string; title?: string }[])
      .filter(m => (m.title ?? "").toLowerCase().includes(q))
      .slice(0, 12)
      .map(m => ({
        type: "Matter" as const,
        idWithType: `M-${m.matterId ?? m.id}`,
        matterId: String(m.matterId ?? m.id),
        title: m.title,
      }))
    const clients = (staticClients as {
      id?: string; companyName?: string; firstName?: string; lastName?: string; clientType?: string
    }[])
      .filter(c => `${c.companyName ?? ""} ${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase().includes(q))
      .slice(0, 12)
      .map(c => ({
        type: "Client" as const,
        idWithType: `C-${c.id}`,
        clientId: String(c.id),
        companyName: c.companyName,
        firstName: c.firstName,
        clientType: c.clientType,
      }))
    return [...matters, ...clients]
  }

  const res = await axiosClient.post("/api/util/global/search", { searchKey })
  const data = res.data?.data ?? res.data ?? {}
  const matterResults = Array.isArray(data.matterResults) ? data.matterResults : []
  const clientResults = Array.isArray(data.clientResults) ? data.clientResults : []

  const matters: SearchOption[] = matterResults.map((item: Record<string, string>) => ({
    ...item,
    type: "Matter",
    idWithType: `M-${item.matterId}`,
    matterId: item.matterId,
    title: item.title,
  }))

  const clients: SearchOption[] = clientResults.map((item: Record<string, string>) => ({
    ...item,
    type: "Client",
    idWithType: `C-${item.clientId ?? item.id}`,
    clientId: item.clientId ?? item.id,
    companyName: item.companyName,
    firstName: item.firstName,
    clientType: item.clientType,
  }))

  return [...matters, ...clients]
}

export function GlobalSearch({ fullWidth = false }: { fullWidth?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (env.USE_STATIC_DATA) return
    void authApi.checkSession()
    const id = window.setInterval(() => { void authApi.checkSession() }, 600_000)
    return () => clearInterval(id)
  }, [])

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
    const raw = option.idWithType?.slice(2) ?? ""
    if (option.type === "Client" || option.idWithType?.startsWith("C")) {
      navigate(`/clients/${option.clientId ?? raw}`)
    } else {
      navigate(`/matters/${option.matterId ?? raw}`)
    }
    setInputValue("")
    setOptions([])
  }

  return (
    <Autocomplete
      size="small"
      sx={{
        width: fullWidth ? "100%" : { xs: "100%", sm: 260, md: 300 },
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
      }}
      options={options}
      loading={loading}
      inputValue={inputValue}
      value={null}
      clearOnBlur={false}
      blurOnSelect
      filterOptions={(x) => x}
      groupBy={(o) => o.type}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => a.idWithType === b.idWithType}
      noOptionsText={inputValue.trim() ? t("common.noOptions", "No Options") : t("common.typeToSearch", "Type to search")}
      onChange={(_, value) => handleSelect(value)}
      onInputChange={(_, value, reason) => {
        if (reason === "reset") return
        setInputValue(value)
        scheduleSearch(value)
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t("common.search", "Search")}
          variant="outlined"
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={14} sx={{ mr: 1 }} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.paper",
              borderRadius: 1.5,
              fontSize: 13,
              height: 40,
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
      renderOption={(props, option) => {
        const { key: _k, ...rest } = props as { key?: React.Key } & Record<string, unknown>
        return (
          <Box component="li" key={option.idWithType} {...rest}>
            <Typography variant="body2">{optionLabel(option)}</Typography>
          </Box>
        )
      }}
    />
  )
}
