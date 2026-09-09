import { Box, Typography, Button } from "@mui/material"
import type { ReactNode } from "react"
type Variant = "empty"|"search"|"error"|"access"|"offline"
const ILLUSTRATIONS: Record<Variant, ReactNode> = {
  empty: (<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="currentColor" fillOpacity="0.06"/><rect x="28" y="38" width="64" height="52" rx="4" fill="currentColor" fillOpacity="0.12"/><rect x="28" y="38" width="64" height="16" rx="4" fill="currentColor" fillOpacity="0.2"/><path d="M44 72h32M44 82h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4"/><path d="M60 28v10M52 32l4 6M68 32l-4 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3"/></svg>),
  search: (<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="currentColor" fillOpacity="0.06"/><circle cx="52" cy="52" r="22" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M68 68l16 16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.4"/><path d="M44 52h16M52 44v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.25"/><circle cx="52" cy="52" r="8" fill="currentColor" fillOpacity="0.08"/></svg>),
  error: (<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="#FEF3C7"/><path d="M60 30L95 88H25L60 30Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2.5" strokeLinejoin="round"/><path d="M60 55v16" stroke="#B45309" strokeWidth="3" strokeLinecap="round"/><circle cx="60" cy="78" r="2.5" fill="#B45309"/></svg>),
  access: (<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="currentColor" fillOpacity="0.06"/><rect x="38" y="56" width="44" height="32" rx="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/><path d="M48 56V46a12 12 0 0124 0v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4"/><circle cx="60" cy="72" r="5" fill="currentColor" fillOpacity="0.4"/><path d="M60 77v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4"/></svg>),
  offline: (<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="60" fill="currentColor" fillOpacity="0.06"/><path d="M36 64a26 26 0 0148 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.2"/><path d="M44 72a16 16 0 0132 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3"/><path d="M52 80a10 10 0 0116 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4"/><circle cx="60" cy="88" r="4" fill="currentColor" fillOpacity="0.5"/><path d="M30 38l60 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.2"/></svg>),
}
const DEFAULTS: Record<Variant,{title:string;description:string}> = {
  empty:   {title:"No records found",        description:"There is nothing here yet. Get started by creating your first record."},
  search:  {title:"No results found",        description:"Try adjusting your search terms or clearing your filters."},
  error:   {title:"Something went wrong",    description:"Failed to load data. Please try again or contact support if the issue persists."},
  access:  {title:"Access restricted",       description:"You don't have permission to view this page. Contact your administrator."},
  offline: {title:"Connection lost",         description:"Please check your internet connection and try again."},
}
interface Props {variant?:Variant;title?:string;description?:string;action?:{label:string;onClick:()=>void};secondAction?:{label:string;onClick:()=>void};compact?:boolean}
export function EmptyState({variant="empty",title,description,action,secondAction,compact=false}:Props) {
  const d=DEFAULTS[variant]
  return (
    <Box sx={{py:compact?4:8,px:2,display:"flex",flexDirection:"column",alignItems:"center",gap:1.5,textAlign:"center",color:"text.secondary"}}>
      <Box sx={{mb:0.5}}>{ILLUSTRATIONS[variant]}</Box>
      <Typography variant={compact?"subtitle2":"subtitle1"} sx={{fontWeight:600,color:"text.primary"}}>{title??d.title}</Typography>
      <Typography variant="body2" sx={{color:"text.secondary",maxWidth:360,lineHeight:1.6}}>{description??d.description}</Typography>
      {(action||secondAction)&&<Box sx={{display:"flex",gap:1,mt:0.5,flexWrap:"wrap",justifyContent:"center"}}>
        {secondAction&&<Button size="small" variant="outlined" onClick={secondAction.onClick}>{secondAction.label}</Button>}
        {action&&<Button size="small" variant="contained" onClick={action.onClick}>{action.label}</Button>}
      </Box>}
    </Box>
  )
}
