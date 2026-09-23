/**
 * Shared shells for settings sub-pages that need custom forms (not only LookupManager).
 */
import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Paper, Typography, Button, CircularProgress, Switch, FormControlLabel,
  TextField, Checkbox, List, ListItem, ListItemText, ListItemSecondaryAction,
} from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { LookupManager } from "./LookupManager"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"

function SettingsSubShell({
  title, description, children,
}: { title: string; description: string; children: React.ReactNode }) {
  return (
    <PageShell
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Settings", path: "/admin/settings" },
        { label: title },
      ]}
      action={
        <Button component={RouterLink} to="/admin/settings" size="small" startIcon={<ArrowBackIcon />} variant="outlined">
          All settings
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 800, width: "100%" }}>
        {children}
      </Paper>
    </PageShell>
  )
}

export function WorkingDaysPage() {
  const [days, setDays] = useState<Record<string, boolean>>({
    Sunday: false, Monday: true, Tuesday: true, Wednesday: true,
    Thursday: true, Friday: true, Saturday: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!env.USE_STATIC_DATA) {
          const r = await axiosClient.get("/api/util/get/working/days")
          const data = r.data?.data ?? r.data
          if (data && typeof data === "object" && !cancelled) {
            setDays(prev => ({ ...prev, ...data }))
          }
        }
      } catch { /* keep defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/util/working/days", days)
      toast.success("Working days saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Working Days" description="Setting up working days master">
      {loading ? <CircularProgress size={28} /> : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Object.keys(days).map(day => (
            <FormControlLabel
              key={day}
              control={<Switch checked={!!days[day]} onChange={(_, v) => setDays(d => ({ ...d, [day]: v }))} />}
              label={day}
            />
          ))}
          <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start", mt: 2 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      )}
    </SettingsSubShell>
  )
}

export function MyDashboardSettingsPage() {
  const [setup, setSetup] = useState<Record<string, boolean>>({
    leads: true, matters: true, tasks: true, hearings: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await adminApi.getSetupInfo() as Record<string, unknown>
        if (cancelled) return
        const flags: Record<string, boolean> = {}
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "boolean") flags[k] = v
        }
        if (Object.keys(flags).length > 0) setSetup(flags)
      } catch { /* defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/dashboard/setup", setup)
      toast.success("Dashboard preferences saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="My Dashboard" description="Customize My dashboard">
      {loading ? <CircularProgress size={28} /> : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Object.keys(setup).map(key => (
            <FormControlLabel
              key={key}
              control={<Checkbox checked={!!setup[key]} onChange={(_, v) => setSetup(s => ({ ...s, [key]: v }))} />}
              label={key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}
            />
          ))}
          <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start", mt: 2 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      )}
    </SettingsSubShell>
  )
}

export function InvoiceSequencePage() {
  const [prefix, setPrefix] = useState("INV")
  const [next, setNext] = useState("1")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        if (env.USE_STATIC_DATA) return
        const r = await axiosClient.get("/api/util/invoice/sequence")
        const d = r.data?.data ?? r.data ?? {}
        if (d.prefix) setPrefix(String(d.prefix))
        if (d.next != null) setNext(String(d.next))
      } catch { /* defaults */ }
    })()
  }, [])

  async function save() {
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/util/invoice/sequence", { prefix, next: Number(next) })
      }
      toast.success("Invoice sequence saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Invoice Sequence" description="Configure invoice sequences">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}>
        <TextField size="small" label="Prefix" value={prefix} onChange={e => setPrefix(e.target.value)} />
        <TextField size="small" label="Next number" type="number" value={next} onChange={e => setNext(e.target.value)} />
        <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </SettingsSubShell>
  )
}

export function CustomFieldsPage() {
  return (
    <SettingsSubShell title="Custom Field" description="Custom Field Master">
      <LookupManager
        title="Custom Fields"
        getUrl="/api/util/list/custom/field"
        addUrl="/api/util/add/custom/field"
        deleteUrl="/api/util/custom/field/change/status"
        nameField="fieldName"
        queryKey="settings-custom-fields"
        statusChange
      />
    </SettingsSubShell>
  )
}

export function ConflictCheckSettingsPage() {
  const [terms, setTerms] = useState("")
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        if (!env.USE_STATIC_DATA) {
          const r = await axiosClient.get("/api/settings/conflict-check-settings")
          const d = r.data?.data ?? r.data
          const excluded = Array.isArray(d?.excludedTerms) ? d.excludedTerms.map(String) : []
          setList(excluded)
        }
      } catch { /* empty */ }
      finally { setLoading(false) }
    })()
  }, [])

  async function addTerm() {
    const t = terms.trim()
    if (!t) return
    const next = [...list, t]
    setList(next)
    setTerms("")
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/settings/conflict-check-settings", { excludedTerms: next })
      }
      toast.success("Term added")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  async function removeTerm(term: string) {
    const next = list.filter(x => x !== term)
    setList(next)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/settings/conflict-check-settings", { excludedTerms: next })
      }
    } catch { toast.error("Failed to save") }
  }

  return (
    <SettingsSubShell title="Conflict Check Settings" description="Excluded terms for conflict matching">
      {loading ? <CircularProgress size={28} /> : (
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              size="small" fullWidth label="Excluded term" value={terms}
              onChange={e => setTerms(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTerm()}
            />
            <Button variant="contained" onClick={addTerm} disabled={saving || !terms.trim()}>Add</Button>
          </Box>
          <List dense>
            {list.map(t => (
              <ListItem key={t} divider>
                <ListItemText primary={t} />
                <ListItemSecondaryAction>
                  <Button size="small" color="error" onClick={() => removeTerm(t)}>Remove</Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {list.length === 0 && (
              <Typography variant="body2" color="text.secondary">No excluded terms yet.</Typography>
            )}
          </List>
        </Box>
      )}
    </SettingsSubShell>
  )
}

export function UserNotificationsPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-min-notify"],
    queryFn: () => adminApi.getUsersMin(),
  })
  const { data: exclusions = [] } = useQuery({
    queryKey: ["user-notification-exclusions"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return []
      const r = await axiosClient.get("/api/user-notification-exclusions")
      return r.data?.data ?? r.data ?? []
    },
  })
  const excludedIds = new Set(
    (exclusions as { userId?: string; sendNotificationEnabled?: boolean }[])
      .filter(e => e.sendNotificationEnabled === false || e.sendNotificationEnabled == null)
      .map(e => String(e.userId ?? "")),
  )

  async function toggle(userId: string, exclude: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        const existing = (exclusions as { id?: string; userId?: string; sendNotificationEnabled?: boolean }[])
          .find(e => String(e.userId ?? "") === userId)
        if (exclude) {
          if (existing?.id) {
            await axiosClient.put(
              `/api/user-notification-exclusions/${existing.id}?sendNotificationEnabled=false`,
            )
          } else {
            await axiosClient.post("/api/user-notification-exclusions", {
              id: "",
              sendNotificationEnabled: false,
              userId,
            })
          }
        } else if (existing?.id) {
          await axiosClient.delete(`/api/user-notification-exclusions?id=${existing.id}`)
        }
      }
      qc.invalidateQueries({ queryKey: ["user-notification-exclusions"] })
      toast.success(exclude ? "User excluded" : "User included")
    } catch { toast.error("Failed to update") }
  }

  return (
    <SettingsSubShell title="Users Notifications" description="Notification exclusions for users without timelog entry">
      {isLoading ? <CircularProgress size={28} /> : (
        <List dense>
          {(users as { id: string; firstName: string; lastName: string }[]).map(u => (
            <ListItem key={u.id} divider>
              <ListItemText primary={`${u.firstName} ${u.lastName}`} />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={excludedIds.has(u.id)}
                      onChange={(_, v) => toggle(u.id, v)}
                    />
                  }
                  label="Exclude"
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </SettingsSubShell>
  )
}

export function ZohoPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <SettingsSubShell title={title} description={description}>
      <Typography variant="body2" color="text.secondary">
        Zoho configuration uses the same LMS endpoints
        (`/client/zoho`, `/settings/integration-settings`, `/department-ledgers`).
        Connect your Zoho account in the firm admin environment to manage these options.
      </Typography>
    </SettingsSubShell>
  )
}

export function TeamRolesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "tr1", name: "Responsible Attorney", category: "Matter" },
          { id: "tr2", name: "Paralegal", category: "Matter" },
        ]
      }
      const r = await axiosClient.get("/api/team-role/get/all")
      return r.data?.data ?? r.data ?? []
    },
  })
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  async function add() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/team-role/add", { name: name.trim() })
      setName("")
      qc.invalidateQueries({ queryKey: ["team-roles"] })
      toast.success("Role added")
    } catch { toast.error("Failed to add") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Team Roles" description="Configure team roles by category for matter assignments">
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField size="small" fullWidth label="Role name" value={name} onChange={e => setName(e.target.value)} />
        <Button variant="contained" onClick={add} disabled={saving || !name.trim()}>Add</Button>
      </Box>
      {isLoading ? <CircularProgress size={28} /> : (
        <List dense>
          {(data as { id: string; name: string; category?: string }[]).map(r => (
            <ListItem key={r.id} divider>
              <ListItemText primary={r.name} secondary={r.category} />
            </ListItem>
          ))}
        </List>
      )}
    </SettingsSubShell>
  )
}

export function EstimatedHoursPage() {
  return (
    <SettingsSubShell title="Estimated Hours by Designation" description="Manage estimated hours templates">
      <LookupManager
        title="Templates"
        getUrl="/api/util/list/estimated/hours"
        addUrl="/api/util/add/estimated/hours"
        deleteUrl="/api/util/estimated/hours/change/status"
        nameField="name"
        queryKey="settings-estimated-hours"
        statusChange
      />
    </SettingsSubShell>
  )
}

export function AnalyticsPermissionsPage() {
  return (
    <SettingsSubShell title="Analytics Permissions" description="Configure Permissions for Analytics">
      <LookupManager
        title="Analytics Permissions"
        getUrl="/api/analytics/permissions"
        addUrl="/api/analytics/permissions"
        deleteUrl="/api/analytics/permissions"
        nameField="roleName"
        queryKey="settings-analytics-permissions"
        statusChange
      />
    </SettingsSubShell>
  )
}
