import { useEffect }    from "react"
import { useAuthStore } from "@lib/store/authStore"
import { axiosClient }  from "@lib/api/axios"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use accessToken — the field name in @lib/store/authStore
  const token = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (token) {
      axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete axiosClient.defaults.headers.common["Authorization"]
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const ping = () => axiosClient.get("/api/user/check/session").catch(() => {})
    const id = setInterval(ping, 5 * 60_000)
    return () => clearInterval(id)
  }, [token])

  return <>{children}</>
}
