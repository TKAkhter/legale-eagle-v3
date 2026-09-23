import { Tabs as MuiTabs, Tab, Box } from '@mui/material'
import { useState, type ReactNode } from 'react'

interface TabItem { label: string; content: ReactNode; icon?: ReactNode; disabled?: boolean }
interface Props { tabs: TabItem[]; defaultTab?: number; onChange?: (i: number) => void }

/** Scrollable tabs so detail pages never force horizontal page scroll. */
export function Tabs({ tabs, defaultTab = 0, onChange }: Props) {
  const [active, setActive] = useState(defaultTab)
  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <MuiTabs
        value={active}
        onChange={(_, v) => { setActive(v); onChange?.(v) }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, maxWidth: '100%' }}
      >
        {tabs.map((t) => (
          <Tab
            key={t.label}
            label={t.label}
            icon={t.icon as React.ReactElement | undefined}
            iconPosition="start"
            disabled={t.disabled}
            sx={{ textTransform: 'none', minHeight: 44 }}
          />
        ))}
      </MuiTabs>
      <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        {tabs[active]?.content}
      </Box>
    </Box>
  )
}
