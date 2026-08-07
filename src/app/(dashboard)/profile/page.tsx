import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Paper, Typography, Avatar, Button, Alert, CircularProgress, Chip, Divider } from "@mui/material"
import PersonIcon from "@mui/icons-material/Person"
import LockIcon from "@mui/icons-material/Lock"
import { useAuthStore } from "@lib/store/authStore"
import { useThemeStore } from "@lib/store/themeStore"
import { authApi } from "@/api/auth"
import { toast } from "@/lib/toast"
import { PageShell } from "@/components/ui/PageShell"
import { ControlledInput } from "@components/forms/ControlledInput"
const pwSchema=z.object({oldPassword:z.string().min(1,"Required"),newPassword:z.string().min(8,"Min 8 characters"),confirmPassword:z.string().min(1,"Required")}).refine(d=>d.newPassword===d.confirmPassword,{message:"Passwords do not match",path:["confirmPassword"]})
type PwForm=z.infer<typeof pwSchema>
export default function ProfilePage(){
  const user=useAuthStore(s=>(s as {user?:{firstName?:string;lastName?:string;email?:string;companyUserType?:string;department?:{name:string}}}).user)
  const colorMode=useThemeStore(s=>s.colorMode)
  const toggleMode=useThemeStore(s=>s.toggleColorMode)
  const language=useThemeStore(s=>s.language)
  const setLang=useThemeStore(s=>s.setLanguage)
  const[pwError,setPwError]=useState("")
  const{control,handleSubmit,reset,formState:{isSubmitting}}=useForm<PwForm>({resolver:zodResolver(pwSchema)})
  async function onChangePassword(vals:PwForm){setPwError("");try{await authApi.changePassword(vals.oldPassword,vals.newPassword,vals.confirmPassword);toast.success("Password changed successfully");reset()}catch(e:unknown){const msg=(e as{response?:{data?:{message?:string}}})?.response?.data?.message??"Failed to change password";setPwError(msg);toast.error(msg)}}
  const initials=`${user?.firstName?.[0]??""}${user?.lastName?.[0]??""}`.toUpperCase()
  return(
    <PageShell title="Profile & Settings" description="Manage your account and preferences">
      <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:3,maxWidth:900}}>
        <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}>
          <Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider",display:"flex",alignItems:"center",gap:1}}><PersonIcon sx={{fontSize:18,color:"text.secondary"}}/><Typography variant="subtitle1" sx={{fontWeight:600,fontSize:14}}>Account Information</Typography></Box>
          <Box sx={{p:3,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <Avatar sx={{width:72,height:72,fontSize:24,bgcolor:"primary.main"}}>{initials}</Avatar>
            <Box sx={{textAlign:"center"}}>
              <Typography variant="h6" sx={{fontWeight:600}}>{user?.firstName} {user?.lastName}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Box sx={{mt:1,display:"flex",gap:1,justifyContent:"center"}}>
                <Chip size="small" label={user?.companyUserType??"ATTORNEY"} color="primary" variant="outlined"/>
                {user?.department&&<Chip size="small" label={user.department.name} variant="outlined"/>}
              </Box>
            </Box>
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}>
          <Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider"}}><Typography variant="subtitle1" sx={{fontWeight:600,fontSize:14}}>Preferences</Typography></Box>
          <Box sx={{p:3,display:"flex",flexDirection:"column",gap:3}}>
            <Box><Typography variant="body2" sx={{fontWeight:500,mb:1}}>Theme</Typography><Box sx={{display:"flex",gap:1}}>{(["light","dark"] as const).map(m=><Button key={m} size="small" variant={colorMode===m?"contained":"outlined"} onClick={()=>colorMode!==m&&toggleMode()}>{m==="light"?"☀️ Light":"🌙 Dark"}</Button>)}</Box></Box>
            <Box><Typography variant="body2" sx={{fontWeight:500,mb:1}}>Language</Typography><Box sx={{display:"flex",gap:1}}>{([["en","English"],["ar","العربية"]] as const).map(([code,label])=><Button key={code} size="small" variant={language===code?"contained":"outlined"} onClick={()=>setLang(code)}>{label}</Button>)}</Box></Box>
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden",gridColumn:{md:"span 2"}}}>
          <Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider",display:"flex",alignItems:"center",gap:1}}><LockIcon sx={{fontSize:18,color:"text.secondary"}}/><Typography variant="subtitle1" sx={{fontWeight:600,fontSize:14}}>Change Password</Typography></Box>
          <Box component="form" onSubmit={handleSubmit(onChangePassword)} sx={{p:3,display:"flex",flexDirection:"column",gap:2,maxWidth:400}}>
            {pwError&&<Alert severity="error" onClose={()=>setPwError("")}>{pwError}</Alert>}
            <ControlledInput name="oldPassword" control={control} label="Current Password" type="password" required/>
            <ControlledInput name="newPassword" control={control} label="New Password" type="password" required/>
            <ControlledInput name="confirmPassword" control={control} label="Confirm New Password" type="password" required/>
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{alignSelf:"flex-start"}}>{isSubmitting?<CircularProgress size={20} color="inherit"/>:"Update Password"}</Button>
          </Box>
        </Paper>
      </Box>
    </PageShell>
  )
}
