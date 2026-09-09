import { useState, useEffect } from "react"
import { Dialog, DialogTitle, DialogContent, Box, Typography, Divider, Paper, IconButton } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
const SHORTCUTS = [
  { group:"Navigation", shortcuts:[
    {keys:["Ctrl","K"],description:"Open command palette"},
    {keys:["?"],description:"Show keyboard shortcuts"},
    {keys:["Esc"],description:"Close modal / dismiss"},
  ]},
  { group:"Data Table", shortcuts:[
    {keys:["↑","↓"],description:"Navigate rows"},
    {keys:["Enter"],description:"Open row detail"},
    {keys:["Ctrl","C"],description:"Copy focused row value"},
    {keys:["Right-click"],description:"Row context menu"},
  ]},
  { group:"General", shortcuts:[
    {keys:["Alt","D"],description:"Go to Dashboard"},
    {keys:["Alt","L"],description:"Go to Leads"},
    {keys:["Alt","M"],description:"Go to Matters"},
  ]},
]
export function KeyboardShortcutsModal() {
  const [open,setOpen] = useState(false)
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      const tag=(e.target as HTMLElement).tagName.toLowerCase()
      if(e.key==="?"&&!["input","textarea","select"].includes(tag)){e.preventDefault();setOpen(p=>!p)}
      if(e.key==="Escape")setOpen(false)
    }
    window.addEventListener("keydown",onKey)
    return()=>window.removeEventListener("keydown",onKey)
  },[])
  return (
    <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth sx={{"& .MuiDialog-paper":{borderRadius:3}}}>
      <DialogTitle sx={{display:"flex",justifyContent:"space-between",alignItems:"center",pb:1}}>
        <Typography variant="h6" sx={{fontWeight:700}}>Keyboard Shortcuts</Typography>
        <IconButton size="small" onClick={()=>setOpen(false)}><CloseIcon fontSize="small"/></IconButton>
      </DialogTitle>
      <DialogContent sx={{pb:3}}>
        {SHORTCUTS.map((g,gi)=>(
          <Box key={g.group} sx={{mb:gi<SHORTCUTS.length-1?3:0}}>
            <Typography variant="caption" sx={{fontWeight:700,color:"text.secondary",textTransform:"uppercase",letterSpacing:"0.08em",fontSize:10,display:"block",mb:1.5}}>{g.group}</Typography>
            <Box sx={{display:"flex",flexDirection:"column",gap:1}}>
              {g.shortcuts.map(sc=>(
                <Box key={sc.description} sx={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <Typography variant="body2" color="text.secondary">{sc.description}</Typography>
                  <Box sx={{display:"flex",gap:0.5}}>
                    {sc.keys.map((k,i)=>(
                      <Box key={i} sx={{display:"flex",alignItems:"center",gap:0.5}}>
                        {i>0&&<Typography variant="caption" color="text.disabled">+</Typography>}
                        <Paper variant="outlined" sx={{px:0.75,py:0.25,borderRadius:0.75,minWidth:28,textAlign:"center"}}><Typography variant="caption" sx={{fontFamily:"monospace",fontSize:11,fontWeight:600}}>{k}</Typography></Paper>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
            {gi<SHORTCUTS.length-1&&<Divider sx={{mt:2.5}}/>}
          </Box>
        ))}
        <Box sx={{mt:3,p:1.5,bgcolor:"action.hover",borderRadius:1.5,textAlign:"center"}}>
          <Typography variant="caption" color="text.secondary">Press <Paper component="span" variant="outlined" sx={{px:0.75,py:0.125,borderRadius:0.75,fontFamily:"monospace",fontSize:11}}>?</Paper> anywhere to toggle</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
