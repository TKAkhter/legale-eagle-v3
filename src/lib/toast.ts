/**
 * lib/toast.ts — centralised toast notifications.
 *
 * Usage anywhere in the app:
 *   import { toast } from "@/lib/toast"
 *   toast.success("Client saved")
 *   toast.error("Failed to save")
 *   toast.info("Processing...")
 *   toast.warning("Session expiring soon")
 *
 * Backed by a Zustand store so no React context needed.
 * ToastContainer renders in AppProviders.
 */
import { create } from "zustand"

export type ToastSeverity = "success" | "error" | "warning" | "info"

export interface ToastMessage {
  id:       string
  message:  string
  severity: ToastSeverity
}

interface ToastState {
  messages: ToastMessage[]
  push:   (msg: string, severity: ToastSeverity) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  push: (message, severity) => {
    const id = `${Date.now()}-${Math.random()}`
    set(s => ({ messages: [...s.messages, { id, message, severity }] }))
    setTimeout(() => set(s => ({ messages: s.messages.filter(m => m.id !== id) })), severity === "error" ? 6000 : 4000)
  },
  remove: (id) => set(s => ({ messages: s.messages.filter(m => m.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().push(msg, "success"),
  error:   (msg: string) => useToastStore.getState().push(msg, "error"),
  warning: (msg: string) => useToastStore.getState().push(msg, "warning"),
  info:    (msg: string) => useToastStore.getState().push(msg, "info"),
}
