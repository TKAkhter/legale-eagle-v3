import { Box, Typography, Button, Paper } from "@mui/material"
import { useNavigate } from "react-router-dom"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <Box sx={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",p:3,bgcolor:"background.default"}}>
      <Paper variant="outlined" sx={{p:6,borderRadius:3,textAlign:"center",maxWidth:480}}>
        <Box sx={{width:80,height:80,borderRadius:"50%",bgcolor:"warning.main",display:"flex",alignItems:"center",justifyContent:"center",mx:"auto",mb:3,opacity:0.85}}><LockOutlinedIcon sx={{fontSize:40,color:"white"}}/></Box>
        <Typography variant="h4" sx={{fontWeight:800,mb:1}}>Access denied</Typography>
        <Typography color="text.secondary" sx={{mb:3,lineHeight:1.7}}>You don't have permission to access this page.<br/>Contact your administrator if you believe this is a mistake.</Typography>
        <Box sx={{display:"flex",gap:1.5,justifyContent:"center"}}>
          <Button variant="outlined" onClick={()=>navigate(-1)}>← Go back</Button>
          <Button variant="contained" onClick={()=>navigate("/dashboard")}>Dashboard</Button>
        </Box>
      </Paper>
    </Box>
  )
}
