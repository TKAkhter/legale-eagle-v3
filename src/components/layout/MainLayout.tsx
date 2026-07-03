import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { useThemeStore } from '@lib/store/themeStore'

const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 64
const TOOLBAR_HEIGHT = 56

export function MainLayout() {
  const collapsed = useThemeStore((s) => s.sidebarCollapsed)
  const direction = useThemeStore((s) => s.direction)
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH
  const marginKey = direction === 'rtl' ? 'mr' : 'ml'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar width={sidebarWidth} collapsedWidth={SIDEBAR_COLLAPSED_WIDTH} />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          [marginKey]: `${sidebarWidth}px`,
          transition: 'margin .2s',
        }}
      >
        {/* Toolbar is fixed; this spacer pushes content below it so nothing overlaps */}
        <Toolbar height={TOOLBAR_HEIGHT} sidebarWidth={sidebarWidth} />
        <Box sx={{ height: `${TOOLBAR_HEIGHT}px`, flexShrink: 0 }} />
        <Box component="main" sx={{ flex: 1, p: 3, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
