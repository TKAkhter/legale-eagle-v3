/**
 * Appearance settings — theme + language with flags (LMS parity).
 */
import { Link as RouterLink } from "react-router-dom"
import { Box, Button, Divider, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { LanguageFlagButtons } from "@/components/layout/LanguageSwitcher"
import { useThemeStore } from "@lib/store/themeStore"

export default function AppearanceSettingsPage() {
  const colorMode = useThemeStore(s => s.colorMode)
  const toggleMode = useThemeStore(s => s.toggleColorMode)

  return (
    <PageShell
      title="Appearance"
      description="Theme and language preferences"
      breadcrumbs={[
        { label: "Settings", path: "/admin/settings" },
        { label: "Appearance" },
      ]}
      action={
        <Button component={RouterLink} to="/admin/settings" size="small" startIcon={<ArrowBackIcon />} variant="outlined">
          All settings
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 560 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Theme</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
          {(["light", "dark"] as const).map(m => (
            <Button
              key={m}
              size="small"
              variant={colorMode === m ? "contained" : "outlined"}
              color="primary"
              onClick={() => colorMode !== m && toggleMode()}
            >
              {m === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Language</Typography>
        <LanguageFlagButtons />
      </Paper>
    </PageShell>
  )
}
