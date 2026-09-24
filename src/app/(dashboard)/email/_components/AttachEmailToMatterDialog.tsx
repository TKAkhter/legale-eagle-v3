/**
 * Attach selected Outlook email to a matter — LMS POST /emails/add.
 * Surfaces attached/related matters + client/lead discovery by participant emails.
 */
import { useEffect, useMemo, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, List, ListItem, ListItemText, Typography,
} from "@mui/material"
import { MatterSelectFilter } from "@components/filters/MatterSelectFilter"
import { emailApi, type Email } from "@/api/email"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"

interface Props {
  open: boolean
  onClose: () => void
  email: Email | null
}

interface MatterHint {
  id: string
  title: string
  source: "attached" | "related"
}

interface PartyHit {
  id: string
  label: string
  email?: string
  kind: "client" | "lead"
}

function extractMatters(raw: unknown): MatterHint[] {
  const payload = (raw as { data?: unknown })?.data ?? raw
  const entries = Array.isArray(payload) ? payload : payload ? [payload] : []
  const out: MatterHint[] = []
  for (const entry of entries) {
    const e = entry as Record<string, unknown>
    const matters = (e.matters ?? e.matterIds ?? e.matterList ?? []) as unknown
    if (Array.isArray(matters)) {
      for (const m of matters) {
        if (typeof m === "string") out.push({ id: m, title: m, source: "attached" })
        else if (m && typeof m === "object") {
          const o = m as Record<string, unknown>
          const id = String(o.id ?? o.matterId ?? "")
          if (id) out.push({ id, title: String(o.title ?? o.matterTitle ?? id), source: "attached" })
        }
      }
    }
    const single = e.matter as Record<string, unknown> | undefined
    if (single?.id) {
      out.push({ id: String(single.id), title: String(single.title ?? single.id), source: "attached" })
    }
  }
  return out
}

function encodeEmailId(value: string) {
  try { return btoa(unescape(encodeURIComponent(value))) }
  catch { return value }
}

function participantEmails(email: Email): string[] {
  const parts = [email.from, email.to, email.cc ?? ""]
    .flatMap(s => String(s).split(/[,;]/))
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(parts)].slice(0, 25)
}

function partyLabel(c: Record<string, unknown>) {
  return String(
    c.companyName ?? c.name ?? c.clientName ?? c.leadName
    ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    ?? c.email ?? c.id ?? "—",
  )
}

export function AttachEmailToMatterDialog({ open, onClose, email }: Props) {
  const [matterId, setMatterId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [loadingHints, setLoadingHints] = useState(false)
  const [attached, setAttached] = useState<MatterHint[]>([])
  const [related, setRelated] = useState<MatterHint[]>([])
  const [clients, setClients] = useState<PartyHit[]>([])
  const [leads, setLeads] = useState<PartyHit[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientMatters, setClientMatters] = useState<{ id: string; title: string }[]>([])
  const [loadingClientMatters, setLoadingClientMatters] = useState(false)
  const [showAllLeads, setShowAllLeads] = useState(false)

  const emails = useMemo(() => (email ? participantEmails(email) : []), [email])

  useEffect(() => {
    if (!open || !email) {
      setAttached([]); setRelated([]); setClients([]); setLeads([])
      setSelectedClientId(null); setClientMatters([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingHints(true)
      try {
        if (env.USE_STATIC_DATA) {
          setAttached([])
          setRelated([{ id: "m1", title: "260303 — Building Dispute", source: "related" }])
          setClients([{ id: "c1", label: "Al Rashid Holdings", email: email.from, kind: "client" }])
          setLeads([])
          return
        }

        const emailKey = email.internetMessageId || email.id
        const encoded = encodeEmailId(emailKey)
        const attachedRes = await axiosClient.get("/api/emails/get", {
          params: { emailId: encoded },
        }).catch(() => null)
        const attachedMatters = attachedRes ? extractMatters(attachedRes.data) : []
        if (cancelled) return
        if (attachedMatters.length) {
          setAttached(attachedMatters)
          setRelated([])
        } else {
          setAttached([])
          const relatedMatters: MatterHint[] = []
          if (email.conversationId) {
            try {
              const r = await axiosClient.get("/api/emails/matter/getByConversation", {
                params: { conversationId: email.conversationId },
              })
              for (const m of extractMatters(r.data)) relatedMatters.push({ ...m, source: "related" })
            } catch { /* ignore */ }
          }
          if (email.internetMessageId) {
            try {
              const r = await axiosClient.get("/api/emails/getByInReplyTo", {
                params: { inReplyTo: email.internetMessageId },
              })
              for (const m of extractMatters(r.data)) relatedMatters.push({ ...m, source: "related" })
            } catch { /* ignore */ }
          }
          const seen = new Set<string>()
          setRelated(relatedMatters.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true }))
        }

        // Client / lead discovery by participant emails
        if (emails.length) {
          const clientResults = await Promise.allSettled(
            emails.map(emailId => axiosClient.get("/api/client/email/search", { params: { emailId } })),
          )
          const leadResults = await Promise.allSettled(
            emails.map(emailId => axiosClient.get("/api/leads/email/search", { params: { emailId } })),
          )
          if (cancelled) return

          const clientHits: PartyHit[] = []
          const seenC = new Set<string>()
          for (const r of clientResults) {
            if (r.status !== "fulfilled") continue
            const data = r.value.data?.data ?? r.value.data
            const list = Array.isArray(data) ? data : data ? [data] : []
            for (const c of list as Record<string, unknown>[]) {
              const id = String(c.clientId ?? c.id ?? "")
              if (!id || seenC.has(id)) continue
              seenC.add(id)
              clientHits.push({ id, label: partyLabel(c), email: String(c.email ?? c.emailId ?? ""), kind: "client" })
            }
          }
          setClients(clientHits)

          const leadHits: PartyHit[] = []
          const seenL = new Set<string>()
          for (const r of leadResults) {
            if (r.status !== "fulfilled") continue
            const data = r.value.data?.data ?? r.value.data
            const list = Array.isArray(data) ? data : data ? [data] : []
            for (const c of list as Record<string, unknown>[]) {
              const id = String(c.leadId ?? c.id ?? "")
              if (!id || seenL.has(id)) continue
              seenL.add(id)
              leadHits.push({ id, label: partyLabel(c), email: String(c.email ?? ""), kind: "lead" })
            }
          }
          setLeads(leadHits)
        }
      } finally {
        if (!cancelled) setLoadingHints(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, email, emails])

  useEffect(() => {
    if (!selectedClientId) { setClientMatters([]); return }
    let cancelled = false
    setLoadingClientMatters(true)
    ;(async () => {
      try {
        if (env.USE_STATIC_DATA) {
          setClientMatters([{ id: "m1", title: "260303 — Building Dispute" }])
          return
        }
        const r = await axiosClient.get("/api/matter/list/by/client", {
          params: { clientId: selectedClientId },
        })
        const data = r.data?.data ?? r.data ?? []
        const list = Array.isArray(data) ? data : []
        if (!cancelled) {
          setClientMatters(list.map((m: Record<string, unknown>) => ({
            id: String(m.id ?? m.matterId ?? ""),
            title: String(m.title ?? m.matterTitle ?? m.id ?? ""),
          })).filter(m => m.id))
        }
      } catch {
        if (!cancelled) setClientMatters([])
      } finally {
        if (!cancelled) setLoadingClientMatters(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedClientId])

  async function attach(targetId?: string) {
    const mid = targetId ?? matterId
    if (!email || !mid) { toast.error("Select a matter"); return }
    setSaving(true)
    try {
      toast.success(await emailApi.attachToMatter(mid, email))
      setMatterId(undefined)
      onClose()
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to attach email to matter",
      )
    } finally { setSaving(false) }
  }

  const visibleLeads = showAllLeads ? leads : leads.slice(0, 5)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Attach to Matter</DialogTitle>
      <DialogContent>
        {email && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {email.subject}
          </Typography>
        )}

        {loadingHints ? <CircularProgress size={24} sx={{ mb: 2 }} /> : (
          <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Email attached to Matters
              </Typography>
              {attached.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No matters attached to this email</Typography>
              ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                  {attached.map(m => (
                    <Chip key={m.id} size="small" label={m.title} color="success" variant="outlined"
                      component={RouterLink} to={`/matters/${m.id}`} clickable />
                  ))}
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Related matters
              </Typography>
              {related.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No related matters found</Typography>
              ) : (
                <List dense disablePadding>
                  {related.map(m => (
                    <ListItem key={m.id} secondaryAction={
                      <Button size="small" disabled={saving} onClick={() => void attach(m.id)}>Attach</Button>
                    }>
                      <ListItemText primary={m.title} secondary={m.id} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Matching clients
              </Typography>
              {clients.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No clients matched participant emails</Typography>
              ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                  {clients.map(c => (
                    <Chip
                      key={c.id}
                      size="small"
                      label={c.label}
                      color={selectedClientId === c.id ? "primary" : "default"}
                      variant={selectedClientId === c.id ? "filled" : "outlined"}
                      onClick={() => setSelectedClientId(prev => (prev === c.id ? null : c.id))}
                    />
                  ))}
                </Box>
              )}
              {selectedClientId && (
                <Box sx={{ mt: 1 }}>
                  {loadingClientMatters ? <CircularProgress size={20} /> : clientMatters.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No matters for this client</Typography>
                  ) : (
                    <List dense disablePadding>
                      {clientMatters.map(m => (
                        <ListItem key={m.id} secondaryAction={
                          <Button size="small" disabled={saving} onClick={() => void attach(m.id)}>Attach</Button>
                        }>
                          <ListItemText
                            primary={m.title}
                            secondary={
                              <Typography component={RouterLink} to={`/matters/${m.id}`} variant="caption" color="primary">
                                Open matter
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Matching leads
              </Typography>
              {leads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No leads matched participant emails</Typography>
              ) : (
                <>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                    {visibleLeads.map(l => (
                      <Chip
                        key={l.id}
                        size="small"
                        label={l.label}
                        component={RouterLink}
                        to={`/leads/${l.id}`}
                        clickable
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  {leads.length > 5 && (
                    <Button size="small" onClick={() => setShowAllLeads(v => !v)} sx={{ mt: 0.5 }}>
                      {showAllLeads ? "Show less" : "Show all"}
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Box>
        )}

        <MatterSelectFilter value={matterId} onChange={setMatterId} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void attach()} disabled={saving || !matterId}>
          {saving ? "Attaching…" : "Attach"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
