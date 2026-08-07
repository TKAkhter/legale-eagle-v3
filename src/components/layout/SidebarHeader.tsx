import { Box, Typography, IconButton } from "@mui/material"
import MenuOpenIcon from "@mui/icons-material/MenuOpen"
import MenuIcon from "@mui/icons-material/Menu"
import GavelIcon from "@mui/icons-material/Gavel"
import { useThemeStore } from "@lib/store/themeStore"

export function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  const toggle = useThemeStore((s) => s.toggleSidebar)
  return (
    <Box sx={{ height: 56, display:"flex", alignItems:"center", px: collapsed ? 1.5 : 2, gap: 1, borderBottom:"1px solid", borderColor:"divider", flexShrink:0 }}>
      <GavelIcon sx={{ color:"secondary.main", fontSize: 22, flexShrink: 0 }} />
      {!collapsed && (
        <Typography variant="h6" sx={{ fontWeight:700, color:"text.primary", flex:1, whiteSpace:"nowrap" }}>
          LegalEagle
        </Typography>
      )}
      <IconButton size="small" onClick={toggle} sx={{ color:"text.secondary", ml: "auto" }}>
        {collapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
      </IconButton>
    </Box>
  )
}
