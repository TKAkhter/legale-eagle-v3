import { Alert, Snackbar, Stack } from "@mui/material"
import { useToastStore } from "@/lib/toast"
export function ToastContainer() {
  const { messages, remove } = useToastStore()
  return (
    <Stack spacing={1} sx={{ position:"fixed", bottom:24, right:24, zIndex:9999, maxWidth:400 }}>
      {messages.map(m=>(
        <Snackbar key={m.id} open anchorOrigin={{vertical:"bottom",horizontal:"right"}}>
          <Alert severity={m.severity} variant="filled" onClose={()=>remove(m.id)} sx={{width:"100%",boxShadow:3,borderRadius:2,fontSize:13}}>{m.message}</Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
