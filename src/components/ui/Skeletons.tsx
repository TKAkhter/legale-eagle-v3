import { Box, Skeleton, Paper } from "@mui/material"
export function TableSkeleton({rows=8,cols=5}:{rows?:number;cols?:number}){
  return(<Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}>
    <Box sx={{p:2,display:"flex",gap:1,borderBottom:"1px solid",borderColor:"divider"}}><Skeleton variant="rounded" width={200} height={36}/><Skeleton variant="rounded" width={120} height={36}/><Box sx={{flex:1}}/><Skeleton variant="rounded" width={90} height={36}/></Box>
    <Box sx={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:2,px:2,py:1.5,bgcolor:"action.hover"}}>{Array.from({length:cols}).map((_,i)=><Skeleton key={`col-${i}`} variant="text" height={16} width="60%"/>)}</Box>
    {Array.from({length:rows}).map((_,r)=><Box key={r} sx={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:2,px:2,py:1.5,borderTop:"1px solid",borderColor:"divider"}}>{Array.from({length:cols}).map((_,c)=><Skeleton key={c} variant="text" height={16} width={c===0?"80%":c===cols-1?"40%":"60%"}/>)}</Box>)}
  </Paper>)
}
export function DetailSkeleton(){
  return(<Box sx={{display:"flex",flexDirection:"column",gap:2}}><Box sx={{display:"flex",gap:2,alignItems:"center",mb:1}}><Skeleton variant="circular" width={48} height={48}/><Box sx={{flex:1}}><Skeleton variant="text" width={200} height={28}/><Skeleton variant="text" width={120} height={18}/></Box><Skeleton variant="rounded" width={100} height={36}/></Box>{[1,2].map(i=><Paper key={`card-${i}`} variant="outlined" sx={{p:2.5,borderRadius:2}}><Skeleton variant="text" width={140} height={20} sx={{mb:2}}/><Box sx={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>{Array.from({length:6}).map((_,j)=><Box key={`field-${j}`}><Skeleton variant="text" width="40%" height={14}/><Skeleton variant="text" width="70%" height={18}/></Box>)}</Box></Paper>)}</Box>)
}
export function KpiSkeleton({count=4}:{count?:number}){
  return(<Box sx={{display:"grid",gridTemplateColumns:`repeat(auto-fit,minmax(160px,1fr))`,gap:2}}>{Array.from({length:count}).map((_,i)=><Paper key={`kpi-${i}`} variant="outlined" sx={{p:2.5,borderRadius:2}}><Skeleton variant="text" width="60%" height={14} sx={{mb:1}}/><Skeleton variant="text" width="40%" height={36}/></Paper>)}</Box>)
}
export function WidgetSkeleton({lines=4}:{lines?:number}){
  return(<Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}><Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider"}}><Skeleton variant="text" width={140} height={20}/></Box><Box sx={{p:2.5,display:"flex",flexDirection:"column",gap:1.5}}>{Array.from({length:lines}).map((_,i)=><Box key={`row-${i}`} sx={{display:"flex",justifyContent:"space-between"}}><Skeleton variant="text" width="35%" height={16}/><Skeleton variant="text" width="45%" height={16}/></Box>)}</Box></Paper>)
}
