/**
 * Settings hub — searchable Masters + Settings tiles (LMS SettingsContent parity).
 */
import { useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Paper, Typography, TextField, InputAdornment, IconButton,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined"
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import { PageShell } from "@/components/ui/PageShell"
import { SECTION_GAP } from "@/config/spacing"
import {
  LOOKUP_MASTERS, SETTINGS_TILES, masterHref, type MasterConfig,
} from "./_components/settingsRegistry"

function matches(m: MasterConfig, q: string) {
  if (!q.trim()) return true
  const hay = `${m.title} ${m.description} ${m.keywords ?? ""}`.toLowerCase()
  return hay.includes(q.trim().toLowerCase())
}

function SectionCard({
  title, icon, items,
}: {
  title: string
  icon: React.ReactNode
  items: MasterConfig[]
}) {
  if (items.length === 0) return null
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>{title}</Typography>
      </Box>
      <Box
        sx={{
          p: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        {items.map(item => (
          <Box
            key={item.key}
            component={RouterLink}
            to={masterHref(item)}
            sx={{
              textDecoration: "none",
              color: "inherit",
              p: 1.75,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              transition: "border-color 150ms, background-color 150ms",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
                {item.description}
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled", mt: 0.25, flexShrink: 0 }} />
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

export default function SettingsHubPage() {
  const [query, setQuery] = useState("")

  const masters = useMemo(() => {
    const fromLookup = LOOKUP_MASTERS.filter(m => m.section === "masters")
    const workingDays = SETTINGS_TILES.filter(m => m.key === "working-days")
    return [...fromLookup, ...workingDays].filter(m => matches(m, query))
  }, [query])

  const settings = useMemo(
    () => SETTINGS_TILES.filter(m => m.section === "settings" && matches(m, query)),
    [query],
  )

  const empty = masters.length === 0 && settings.length === 0

  return (
    <PageShell title="Settings" description="Firm masters and configuration">
      <Box sx={{ display: "flex", flexDirection: "column", gap: SECTION_GAP, width: "100%" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search settings..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery("")} aria-label="Clear search">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
          sx={{ maxWidth: 420 }}
        />

        {empty ? (
          <Typography color="text.secondary">No settings match “{query}”.</Typography>
        ) : (
          <>
            <SectionCard
              title="Masters"
              icon={<AppsOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
              items={masters}
            />
            <SectionCard
              title="Settings"
              icon={<SettingsOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
              items={settings}
            />
          </>
        )}
      </Box>
    </PageShell>
  )
}
