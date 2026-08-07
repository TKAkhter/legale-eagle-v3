import { type ReactNode } from "react"
import { Box, Typography } from "@mui/material"
import { Breadcrumbs } from "./Breadcrumbs"
import { ErrorBoundary } from "./ErrorBoundary"
interface Props{title:string;description?:string;action?:ReactNode;children:ReactNode;breadcrumbs?:{label:string;path?:string}[]}
export function PageShell({title,description,action,children,breadcrumbs}:Props){
  return(
    <ErrorBoundary>
      <Box>
        <Breadcrumbs items={breadcrumbs}/>
        <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:2.5}}>
          <Box>
            <Typography variant="h5" sx={{fontWeight:700,letterSpacing:"-0.01em",color:"text.primary"}}>{title}</Typography>
            {description&&<Typography variant="body2" sx={{color:"text.secondary",mt:0.25}}>{description}</Typography>}
          </Box>
          {action&&<Box sx={{flexShrink:0,ml:2}}>{action}</Box>}
        </Box>
        {children}
      </Box>
    </ErrorBoundary>
  )
}
