import { Box, Typography, Button, Paper } from "@mui/material"
import { useNavigate } from "react-router-dom"
export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Box sx={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",p:3,bgcolor:"background.default"}}>
      <Paper variant="outlined" sx={{p:6,borderRadius:3,textAlign:"center",maxWidth:480}}>
        <Box sx={{mb:3,opacity:0.15}}>
          <Typography sx={{fontSize:96,fontWeight:900,lineHeight:1,color:"text.primary"}}>404</Typography>
        </Box>
        <Typography variant="h4" sx={{fontWeight:800,mb:1}}>Page not found</Typography>
        <Typography color="text.secondary" sx={{mb:3,lineHeight:1.7}}>The page you're looking for doesn't exist or has been moved.</Typography>
        <Box sx={{display:"flex",gap:1.5,justifyContent:"center"}}>
          <Button variant="outlined" onClick={()=>navigate(-1)}>← Go back</Button>
          <Button variant="contained" onClick={()=>navigate("/dashboard")}>Dashboard</Button>
        </Box>
      </Paper>
    </Box>
  )
}
