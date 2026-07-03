import { Drawer as MuiDrawer, Box, Typography, IconButton, Divider } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
type Anchor = 'left'|'right'|'top'|'bottom'
interface Props { open:boolean; onClose:()=>void; title?:string; children:React.ReactNode; anchor?:Anchor; width?:number|string }
export function Drawer({ open, onClose, title, children, anchor='right', width=480 }: Props) {
  return (
    <MuiDrawer anchor={anchor} open={open} onClose={onClose} slotProps={{ paper: { sx: { width } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        {title && <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
        <IconButton size="small" onClick={onClose}><CloseIcon/></IconButton>
      </Box>
      <Divider/>
      <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>{children}</Box>
    </MuiDrawer>
  )
}
