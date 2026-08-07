import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress } from "@mui/material"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import DeleteIcon from "@mui/icons-material/Delete"
import { useState } from "react"
interface Props{open:boolean;onClose:()=>void;onConfirm:()=>Promise<void>|void;title?:string;message?:string;confirmLabel?:string;cancelLabel?:string;severity?:"error"|"warning"|"info"}
export function ConfirmDialog({open,onClose,onConfirm,title="Confirm Action",message="Are you sure you want to proceed?",confirmLabel="Confirm",cancelLabel="Cancel",severity="warning"}:Props){
  const [loading,setLoading]=useState(false)
  async function handleConfirm(){setLoading(true);try{await onConfirm()}finally{setLoading(false);onClose()}}
  const color=severity==="error"?"error":severity==="warning"?"warning":"primary"
  const Icon=severity==="error"?DeleteIcon:WarningAmberIcon
  return(
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{"& .MuiDialog-paper":{borderRadius:3}}}>
      <DialogTitle sx={{display:"flex",alignItems:"center",gap:1.5,pt:3}}><Icon color={color}/>{title}</DialogTitle>
      <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
      <DialogActions sx={{px:3,pb:3,gap:1}}>
        <Button onClick={onClose} disabled={loading} variant="outlined">{cancelLabel}</Button>
        <Button onClick={handleConfirm} color={color} variant="contained" disabled={loading} startIcon={loading?<CircularProgress size={16} color="inherit"/>:undefined}>{loading?"Processing…":confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}
