/**
 * LanguageSwitcher — LMS LanguageSwitcher parity (flag + EN/AR popover).
 * Closes the menu before applying language so RTL theme remount
 * does not invalidate Popover anchorEl.
 */
import { useState } from "react"
import {
  Backdrop, Box, Button, CircularProgress, ListItemIcon, ListItemText,
  MenuItem, Popover, Typography,
} from "@mui/material"
import { useThemeStore, type Language } from "@lib/store/themeStore"

const LANGUAGES: { id: Language; title: string; flag: string }[] = [
  { id: "en", title: "English", flag: "gb" },
  { id: "ar", title: "العربية", flag: "ae" },
]

function flagSrc(flag: string) {
  return `/assets/images/flags/${flag}.svg`
}

/** Fixed 2:1 flag chip — never stretch (avoid MUI startIcon sizing). */
function FlagImg({ flag, title, size = "md" }: { flag: string; title?: string; size?: "sm" | "md" }) {
  const w = size === "sm" ? 20 : 22
  const h = size === "sm" ? 14 : 15
  return (
    <Box
      component="img"
      src={flagSrc(flag)}
      alt={title ?? ""}
      draggable={false}
      sx={{
        width: w,
        height: h,
        minWidth: w,
        maxWidth: w,
        minHeight: h,
        maxHeight: h,
        objectFit: "contain",
        objectPosition: "center",
        borderRadius: "2px",
        display: "block",
        flexShrink: 0,
        pointerEvents: "none",
        // Prevent global img / button icon rules from stretching
        verticalAlign: "middle",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
      }}
    />
  )
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const language = useThemeStore(s => s.language)
  const setLanguage = useThemeStore(s => s.setLanguage)
  const current = LANGUAGES.find(l => l.id === language) ?? LANGUAGES[0]
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [switching, setSwitching] = useState(false)

  async function select(lng: (typeof LANGUAGES)[number]) {
    // Close first so Popover unmounts before dir/theme flips
    setAnchor(null)
    if (lng.id === language) return

    setSwitching(true)
    try {
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      setLanguage(lng.id)
      // Brief settle for layout/dir
      await new Promise(r => setTimeout(r, 120))
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={switching}
        size="small"
        disableRipple={false}
        aria-label="Change language"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={{
          minWidth: compact ? 56 : 64,
          height: 40,
          px: 1,
          textTransform: "none",
          color: "text.secondary",
          gap: 0.75,
          "& .MuiButton-startIcon": { display: "none" },
        }}
      >
        <FlagImg flag={current.flag} title={current.title} />
        <Typography
          component="span"
          variant="body2"
          sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 12, lineHeight: 1 }}
        >
          {current.id}
        </Typography>
      </Button>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        disableScrollLock
        slotProps={{
          paper: { sx: { py: 0.5, minWidth: 168 } },
        }}
      >
        {LANGUAGES.map(lng => (
          <MenuItem
            key={lng.id}
            selected={lng.id === language}
            disabled={switching}
            onClick={() => { void select(lng) }}
            sx={{ gap: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32, "& img": { display: "block" } }}>
              <FlagImg flag={lng.flag} title={lng.title} size="sm" />
            </ListItemIcon>
            <ListItemText
              primary={lng.title}
              slotProps={{ primary: { sx: { fontSize: 14 } } }}
            />
          </MenuItem>
        ))}
      </Popover>

      <Backdrop open={switching} sx={{ color: "#fff", zIndex: (t) => t.zIndex.modal + 1 }}>
        <CircularProgress color="inherit" size={28} />
      </Backdrop>
    </>
  )
}

/** Compact language buttons with flags (profile / settings cards). */
export function LanguageFlagButtons() {
  const language = useThemeStore(s => s.language)
  const setLanguage = useThemeStore(s => s.setLanguage)
  const [switching, setSwitching] = useState(false)

  async function pick(id: Language) {
    if (id === language || switching) return
    setSwitching(true)
    try {
      setLanguage(id)
      await new Promise(r => setTimeout(r, 120))
    } finally {
      setSwitching(false)
    }
  }

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {LANGUAGES.map(lng => (
        <Button
          key={lng.id}
          size="small"
          variant={language === lng.id ? "contained" : "outlined"}
          color="primary"
          disabled={switching}
          onClick={() => { void pick(lng.id) }}
          sx={{
            textTransform: "none",
            gap: 1,
            px: 1.5,
            // Override MUI icon slot so flag is not forced to a square
            "& .MuiButton-startIcon, & .MuiButton-endIcon": { display: "none" },
          }}
        >
          <FlagImg flag={lng.flag} title={lng.title} size="sm" />
          <Box component="span">{lng.title}</Box>
        </Button>
      ))}
    </Box>
  )
}
