import { env } from '@/config/env'
import React, { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Box, Paper, Typography, Avatar, Button, Alert, CircularProgress, Chip, Divider } from "@mui/material"
import PersonIcon    from "@mui/icons-material/Person"
import LockIcon      from "@mui/icons-material/Lock"
import CameraAltIcon from "@mui/icons-material/CameraAlt"
import { useAuthStore }  from "@lib/store/authStore"
import { useThemeStore } from "@lib/store/themeStore"
import { authApi }       from "@/api/auth"
import { toast }         from "@/lib/toast"
import { PageShell }     from "@/components/ui/PageShell"
import { ControlledInput } from "@components/forms/ControlledInput"

const pwSchema = z.object({
  oldPassword:     z.string().min(1,"Required"),
  newPassword:     z.string().min(8,"Min 8 characters"),
  confirmPassword: z.string().min(1,"Required"),
}).refine(d=>d.newPassword===d.confirmPassword,{message:"Passwords do not match",path:["confirmPassword"]})
type PwForm = z.infer<typeof pwSchema>

export default function ProfilePage() {
  const user        = useAuthStore(s=>(s as {user?:{firstName?:string;lastName?:string;email?:string;companyUserType?:string;department?:{name:string}}}).user)
  const colorMode   = useThemeStore(s=>s.colorMode)
  const toggleMode  = useThemeStore(s=>s.toggleColorMode)
  const language    = useThemeStore(s=>s.language)
  const setLang     = useThemeStore(s=>s.setLanguage)
  const [pwError,setPwError] = useState("")
  const [avatarUrl,setAvatarUrl] = useState<string|null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {control,handleSubmit,reset,formState:{isSubmitting}} = useForm<PwForm>({resolver:zodResolver(pwSchema)})

  function handleAvatarUpload(e:React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = ev => setAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    toast.info("Avatar updated locally")
  }

  const [savingProfile, setSavingProfile] = useState(false)

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      if (!env.USE_STATIC_DATA) {
        const { axiosClient: ax } = await import("@lib/api/axios")
        await ax.put("/api/user/update", { firstName: user?.firstName, lastName: user?.lastName })
      } else {
        await new Promise(r => setTimeout(r, 400))
      }
      toast.success("Profile saved")
    } catch { toast.error("Failed to save profile") }
    finally { setSavingProfile(false) }
  }

  async function onChangePassword(vals:PwForm) {
    setPwError("")
    try {
      await authApi.changePassword(vals.oldPassword,vals.newPassword,vals.confirmPassword)
      toast.success("Password changed successfully")
      reset()
    } catch(e:unknown) {
      const msg=(e as {response?:{data?:{message?:string}}})?.response?.data?.message??"Failed to change password"
      setPwError(msg); toast.error(msg)
    }
  }

  const initials=`${user?.firstName?.[0]??""}${user?.lastName?.[0]??""}`.toUpperCase()
  return (
    <PageShell title="Profile & Settings" description="Manage your account and preferences">
      <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:3,maxWidth:900}}>
        <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden"}}>
          <Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider",display:"flex",alignItems:"center",gap:1}}>
            <PersonIcon sx={{fontSize:18,color:"text.secondary"}}/>
            <Typography variant="subtitle1" sx={{fontWeight:600,fontSize:14}}>Account Information</Typography>
          </Box>
          <Box sx={{p:3,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            {/* Clickable avatar with camera overlay */}
            <Box sx={{position:"relative",display:"inline-block",cursor:"pointer"}} onClick={()=>fileInputRef.current?.click()}>
              <Avatar src={avatarUrl??undefined} sx={{width:80,height:80,fontSize:26,bgcolor:"primary.main"}}>
                {!avatarUrl&&initials}
              </Avatar>
              <Box sx={{position:"absolute",inset:0,borderRadius:"50%",bgcolor:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,"&:hover":{opacity:1},transition:"opacity 200ms"}}>
                <CameraAltIcon sx={{color:"white",fontSize:24}}/>
              </Box>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload}/>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{fontSize:11,mt:-1}}>Click to change photo</Typography>
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
            <Box><Typography variant="body2" sx={{fontWeight:500,mb:1}}>Theme</Typography>
              <Box sx={{display:"flex",gap:1}}>
                {(["light","dark"] as const).map(m=><Button key={m} size="small" variant={colorMode===m?"contained":"outlined"} onClick={()=>colorMode!==m&&toggleMode()}>{m==="light"?"☀️ Light":"🌙 Dark"}</Button>)}
              </Box>
            </Box>
            <Box><Typography variant="body2" sx={{fontWeight:500,mb:1}}>Language</Typography>
              <Box sx={{display:"flex",gap:1}}>
                {([["en","🇬🇧 English"],["ar","🇦🇪 العربية"]] as const).map(([code,label])=><Button key={code} size="small" variant={language===code?"contained":"outlined"} onClick={()=>setLang(code)}>{label}</Button>)}
              </Box>
            </Box>
            <Box sx={{mt:2}}><Button variant="outlined" size="small" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile?"Saving…":"Save Preferences"}</Button></Box>
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{borderRadius:2,overflow:"hidden",gridColumn:{md:"span 2"}}}>
          <Box sx={{px:2.5,py:1.75,borderBottom:"1px solid",borderColor:"divider",display:"flex",alignItems:"center",gap:1}}>
            <LockIcon sx={{fontSize:18,color:"text.secondary"}}/>
            <Typography variant="subtitle1" sx={{fontWeight:600,fontSize:14}}>Change Password</Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit(onChangePassword)} sx={{p:3,display:"flex",flexDirection:"column",gap:2,maxWidth:400}}>
            {pwError&&<Alert severity="error" onClose={()=>setPwError("")}>{pwError}</Alert>}
            <ControlledInput name="oldPassword"     control={control} label="Current Password"   type="password" required/>
            <ControlledInput name="newPassword"     control={control} label="New Password"        type="password" required/>
            <ControlledInput name="confirmPassword" control={control} label="Confirm New Password" type="password" required/>
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{alignSelf:"flex-start"}}>
              {isSubmitting?<CircularProgress size={20} color="inherit"/>:"Update Password"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </PageShell>
  )
}
