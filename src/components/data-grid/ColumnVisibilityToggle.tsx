import { useState } from "react"
import { IconButton, Popover, Box, Typography, Checkbox, FormControlLabel, Tooltip, Divider, Button } from "@mui/material"
import ViewColumnIcon from "@mui/icons-material/ViewColumn"
import type { ColumnDef } from "./types"
interface Props{columns:ColumnDef[];queryKey:string;onChange:(v:Set<string>)=>void}
function sk(qk:string){return`le-cols-${qk}`}
function load(qk:string,cols:ColumnDef[]):Set<string>{try{const s=localStorage.getItem(sk(qk));if(s)return new Set(JSON.parse(s))}catch{}return new Set(cols.map(c=>c.field))}
export function ColumnVisibilityToggle({columns,queryKey,onChange}:Props){
  const [anchor,setAnchor]=useState<HTMLElement|null>(null)
  const [visible,setVisible]=useState<Set<string>>(()=>{const v=load(queryKey,columns);onChange(v);return v})
  function toggle(field:string){setVisible(prev=>{const next=new Set(prev);if(next.has(field)){if(next.size<=1)return prev;next.delete(field)}else next.add(field);localStorage.setItem(sk(queryKey),JSON.stringify([...next]));onChange(next);return next})}
  function showAll(){const all=new Set(columns.map(c=>c.field));setVisible(all);localStorage.setItem(sk(queryKey),JSON.stringify([...all]));onChange(all)}
  const hidden=columns.length-visible.size
  return(<>
    <Tooltip title={hidden>0?`${hidden} column${hidden>1?"s":""} hidden`:"Columns"}>
      <IconButton size="small" onClick={e=>setAnchor(e.currentTarget)} color={hidden>0?"primary":"default"}><ViewColumnIcon fontSize="small"/></IconButton>
    </Tooltip>
    <Popover open={!!anchor} anchorEl={anchor} onClose={()=>setAnchor(null)} anchorOrigin={{vertical:"bottom",horizontal:"right"}} transformOrigin={{vertical:"top",horizontal:"right"}} sx={{"& .MuiPopover-paper":{borderRadius:2,minWidth:200,boxShadow:4}}}>
      <Box sx={{px:2,py:1.5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Typography variant="caption" sx={{fontWeight:600,color:"text.secondary",textTransform:"uppercase",letterSpacing:"0.05em"}}>Columns</Typography>
        {hidden>0&&<Button size="small" sx={{fontSize:11,py:0}} onClick={showAll}>Show all</Button>}
      </Box>
      <Divider/>
      <Box sx={{py:0.5,maxHeight:320,overflowY:"auto"}}>
        {columns.map(col=><FormControlLabel key={col.field} label={<Typography variant="body2">{col.header}</Typography>} control={<Checkbox size="small" checked={visible.has(col.field)} onChange={()=>toggle(col.field)} disabled={visible.size===1&&visible.has(col.field)}/>} sx={{display:"flex",mx:0,px:1.5,py:0.25,"&:hover":{bgcolor:"action.hover"}}}/>)}
      </Box>
    </Popover>
  </>)
}
