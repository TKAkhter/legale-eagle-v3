import { Link, useLocation } from "react-router-dom"
import { Breadcrumbs as MuiBreadcrumbs, Typography, Box } from "@mui/material"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
const LABELS:Record<string,string> = {dashboard:"Dashboard",leads:"Leads",clients:"Clients",matters:"Matters",billing:"Billing",billings:"Billing",tasks:"Tasks",timelogs:"Time Logs",lfa:"LFA",reports:"Reports",admin:"Admin",users:"Users",groups:"Groups",settings:"Settings",locations:"Locations",team:"Team",calendar:"Calendar",approvals:"Approvals",budgeting:"Budgeting","wip":"WIP Reports","matter-billing":"Matter Billing","utilization":"Utilization",profile:"Profile"}
function labelFor(s:string){return LABELS[s]??s.replace(/-/g," ").replace(/\w/g,c=>c.toUpperCase())}
interface BreadcrumbItem{label:string;path?:string}
interface Props{items?:BreadcrumbItem[]}
export function Breadcrumbs({items}:Props){
  const loc=useLocation()
  const crumbs:BreadcrumbItem[]=items??loc.pathname.split("/").filter(Boolean).map((s,i,a)=>({label:labelFor(s),path:i<a.length-1?"/"+a.slice(0,i+1).join("/"):undefined}))
  if(crumbs.length<=1)return null
  return(<Box sx={{mb:1.5}}><MuiBreadcrumbs separator={<NavigateNextIcon sx={{fontSize:14,color:"text.disabled"}}/>}>{crumbs.map((c,i)=>i===crumbs.length-1||!c.path?<Typography key={i} variant="caption" sx={{color:"text.secondary",fontWeight:500}}>{c.label}</Typography>:<Link key={i} to={c.path} style={{textDecoration:"none"}}><Typography variant="caption" sx={{color:"text.disabled","&:hover":{color:"primary.main"}}}>{c.label}</Typography></Link>)}</MuiBreadcrumbs></Box>)
}
