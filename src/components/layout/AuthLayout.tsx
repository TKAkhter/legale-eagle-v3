/**
 * AuthLayout — split-panel layout for Login, Register, Reset Password.
 *
 * Left panel: always dark navy (branding). Hard-coded because it is always dark.
 * Right panel: uses theme tokens so it responds to light/dark mode toggle.
 *
 * FIX: removed hardcoded white background. Now uses bgcolor="background.default"
 * and color="text.primary" so dark mode works correctly on auth pages.
 */
import { Box, Paper, Typography, Divider } from "@mui/material"
import { Outlet } from "react-router-dom"
import GavelIcon from "@mui/icons-material/Gavel"
import { useThemeStore } from "@lib/store/themeStore"

export function AuthLayout() {
  const colorMode = useThemeStore((s) => s.colorMode)

  // Position the dark/light toggle in the top-right corner of the auth page
  return (
    <Box sx={{ minHeight:"100vh", display:"flex", bgcolor:"background.default" }}>
      {/* Left branding panel — always dark navy regardless of app mode */}
      <Box sx={{
        display:{ xs:"none", md:"flex" },
        flexDirection:"column",
        justifyContent:"center",
        width: 420,
        flexShrink: 0,
        bgcolor: "#0F2744",
        px: 6,
        py: 8,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: "\"\"",
          position:"absolute", top:-120, right:-120,
          width:400, height:400, borderRadius:"50%",
          bgcolor:"rgba(0,180,166,0.08)",
        },
        "&::after": {
          content: "\"\"",
          position:"absolute", bottom:-80, left:-80,
          width:300, height:300, borderRadius:"50%",
          bgcolor:"rgba(0,180,166,0.06)",
        },
      }}>
        <Box sx={{ position:"relative", zIndex:1 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mb:5 }}>
            <GavelIcon sx={{ fontSize:32, color:"#00B4A6" }} />
            <Typography variant="h5" sx={{ fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>
              LegalEagle
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight:700, color:"#fff", mb:2, lineHeight:1.25 }}>
            Legal Firm<br />Management
          </Typography>
          <Typography sx={{ color:"rgba(255,255,255,0.6)", fontSize:"0.95rem", lineHeight:1.75, mb:4 }}>
            Manage matters, clients, billing, and team workflows — all in one place.
          </Typography>
          <Divider sx={{ mb:3, borderColor:"rgba(255,255,255,0.12)" }} />
          {[
            "Complete client & matter management",
            "Time tracking & billing automation",
            "Role-based access control",
          ].map(f => (
            <Box key={f} sx={{ display:"flex", alignItems:"center", gap:1.5, mb:1.5 }}>
              <Box sx={{ width:5, height:5, borderRadius:"50%", bgcolor:"#00B4A6", flexShrink:0 }} />
              <Typography sx={{ color:"rgba(255,255,255,0.72)", fontSize:"0.875rem" }}>{f}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right form panel — responds to light/dark mode */}
      <Box sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        bgcolor: "background.default",
      }}>
        <Box sx={{ width:"100%", maxWidth: 420 }}>
          {/* Mobile logo */}
          <Box sx={{ display:{ xs:"flex", md:"none" }, alignItems:"center", gap:1, mb:4 }}>
            <GavelIcon sx={{ fontSize:24, color:"primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight:700, color:"primary.main" }}>LegalEagle</Typography>
          </Box>

          {/* Form panel card */}
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Outlet />
          </Paper>

          <Typography variant="caption" sx={{ display:"block", textAlign:"center", mt:2.5, color:"text.disabled" }}>
            © {new Date().getFullYear()} LegalEagle. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
