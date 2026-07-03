import { Tabs as MuiTabs, Tab, Box } from '@mui/material'
import { useState, type ReactNode } from 'react'
interface TabItem { label:string; content:ReactNode; icon?:ReactNode; disabled?:boolean }
interface Props { tabs:TabItem[]; defaultTab?:number; onChange?:(i:number)=>void }
export function Tabs({ tabs, defaultTab=0, onChange }: Props) {
  const [active, setActive] = useState(defaultTab)
  return (
    <Box>
      <MuiTabs value={active} onChange={(_,v)=>{ setActive(v); onChange?.(v) }} sx={{borderBottom:1,borderColor:'divider',mb:2}}>
        {tabs.map((t,i)=><Tab key={i} label={t.label} icon={t.icon as any} iconPosition="start" disabled={t.disabled}/>)}
      </MuiTabs>
      {tabs[active]?.content}
    </Box>
  )
}
