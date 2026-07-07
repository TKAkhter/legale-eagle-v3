import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '@components/ui/ErrorBoundary'
import { Toolbar } from './Toolbar'
import { useThemeStore } from '@lib/store/themeStore'

const SIDEBAR_WIDTH          = 264
const SIDEBAR_COLLAPSED_WIDTH = 64
const TOOLBAR_HEIGHT          = 56

export function MainLayout() {
  const collapsed  = useThemeStore(s => s.sidebarCollapsed)
  const direction  = useThemeStore(s => s.direction)
  const sw         = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH
  const marginKey  = direction === 'rtl' ? 'mr' : 'ml'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar width={sw} collapsedWidth={SIDEBAR_COLLAPSED_WIDTH} />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, [marginKey]: `${sw}px`, transition: `${marginKey} .2s` }}>
        <Toolbar height={TOOLBAR_HEIGHT} sidebarWidth={sw} />

        {/* Fixed-height spacer so content never hides under the AppBar */}
        <Box sx={{ height: `${TOOLBAR_HEIGHT}px`, flexShrink: 0 }} />

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 }, minHeight: 0 }}>
          {/* Max-width container — prevents content from stretching to 1920px on wide screens */}
          <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
