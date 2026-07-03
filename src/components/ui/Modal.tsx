import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
interface Props { open:boolean; onClose:()=>void; title?:string; children:React.ReactNode; actions?:React.ReactNode; maxWidth?:'xs'|'sm'|'md'|'lg'|'xl'; fullWidth?:boolean }
export function Modal({ open, onClose, title, children, actions, maxWidth='md', fullWidth=true }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth}>
      {title && (
        <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          {title}
          <IconButton size="small" onClick={onClose}><CloseIcon/></IconButton>
        </DialogTitle>
      )}
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions sx={{px:3,pb:2}}>{actions}</DialogActions>}
    </Dialog>
  )
}
