import { create } from "zustand"
export type ToastSeverity = "success"|"error"|"warning"|"info"
export interface ToastMessage { id:string; message:string; severity:ToastSeverity }
interface S { messages:ToastMessage[]; push:(m:string,s:ToastSeverity)=>void; remove:(id:string)=>void }
export const useToastStore = create<S>((set)=>({ messages:[], push:(message,severity)=>{ const id=`${Date.now()}-${Math.random()}`; set(s=>({messages:[...s.messages,{id,message,severity}]})); setTimeout(()=>set(s=>({messages:s.messages.filter(m=>m.id!==id)})),severity==="error"?6000:4000) }, remove:(id)=>set(s=>({messages:s.messages.filter(m=>m.id!==id)})) }))
export const toast = { success:(m:string)=>useToastStore.getState().push(m,"success"), error:(m:string)=>useToastStore.getState().push(m,"error"), warning:(m:string)=>useToastStore.getState().push(m,"warning"), info:(m:string)=>useToastStore.getState().push(m,"info") }
