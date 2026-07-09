import { axiosClient } from "@lib/api/axios"
export interface LoginCredentials { email: string; password: string }
export interface AuthResponse { token: string; refreshToken?: string; user: Record<string,unknown> }
export const authApi = {
  async login(c: LoginCredentials): Promise<AuthResponse> {
    const res = await axiosClient.post("/api/auth/signin", c)
    const d = res.data?.data ?? res.data
    return { token: d.token ?? d.accessToken, refreshToken: d.refreshToken, user: d.user ?? d }
  },
  async resetPassword(email: string): Promise<void> { await axiosClient.post("/api/auth/reset/password", { username: email }) },
}
