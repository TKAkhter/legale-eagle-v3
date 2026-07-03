import { Box, Drawer, ThemeProvider } from '@mui/material'
import { sidebarTheme } from '@config/theme'
import { SidebarNav } from './SidebarNav'
import { useThemeStore } from '@lib/store/themeStore'

interface Props { width: number; collapsedWidth: number }
export function Sidebar({ width, collapsedWidth }: Props) {
  const direction = useThemeStore((s) => s.direction)
  return (
    <ThemeProvider theme={sidebarTheme}>
      <Drawer
        variant="permanent"
        anchor={direction === 'rtl' ? 'right' : 'left'}
        sx={{
          '& .MuiDrawer-paper': {
            width, overflow: 'hidden', transition: 'width .2s',
            border: 'none',
            bgcolor: 'background.default', boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <Box sx={{ p:2, display:'flex', alignItems:'center', height:56, flexShrink:0 }}>
            <Box component="span" sx={{ fontWeight:700, fontSize:18, color:'text.primary', overflow:'hidden', whiteSpace:'nowrap' }}>
              {width > collapsedWidth ? 'LegalEagle' : 'LE'}
            </Box>
          </Box>
          <Box sx={{ flex:1, overflow:'auto', '&::-webkit-scrollbar':{width:4}, '&::-webkit-scrollbar-thumb':{bgcolor:'rgba(255,255,255,.2)',borderRadius:2} }}>
            <SidebarNav collapsed={width <= collapsedWidth} />
          </Box>
        </Box>
      </Drawer>
    </ThemeProvider>
  )
}
