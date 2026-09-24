/**
 * Shared shells for settings sub-pages that need custom forms (not only LookupManager).
 */
import { useEffect, useState } from "react"
import { Link as RouterLink } from "react-router-dom"
import {
  Box, Paper, Typography, Button, CircularProgress, Switch, FormControlLabel,
  TextField, Checkbox, List, ListItem, ListItemText, ListItemSecondaryAction,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, MenuItem,
  FormControl, InputLabel, Select, Table, TableBody, TableCell, TableHead,
  TableRow, IconButton, Divider,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"
import { UserSelectFilter } from "@/components/filters/UserSelectFilter"

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

interface WorkingDayRow {
  days: string
  workingDay: boolean
  startTime: string
  endTime: string
}

const DEFAULT_WORKING_DAYS: WorkingDayRow[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
].map(days => ({ days, workingDay: false, startTime: "10:00", endTime: "18:00" }))

export function WorkingDaysPage() {
  const [rows, setRows] = useState<WorkingDayRow[]>(DEFAULT_WORKING_DAYS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!env.USE_STATIC_DATA) {
          const r = await axiosClient.get("/api/util/get/working/days")
          const info = (r.data?.data?.workingInfo ?? r.data?.workingInfo ?? []) as {
            days?: string; startTime?: string; endTime?: string
          }[]
          if (Array.isArray(info) && info.length && !cancelled) {
            setRows(prev => prev.map(row => {
              const match = info.find(d => d.days === row.days)
              if (!match) return row
              return {
                ...row,
                workingDay: true,
                startTime: String(match.startTime ?? "10:00").slice(0, 5),
                endTime: String(match.endTime ?? "18:00").slice(0, 5),
              }
            }))
          }
        }
      } catch { /* keep defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  function updateRow(index: number, patch: Partial<WorkingDayRow>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function save() {
    setSaving(true)
    try {
      const workingInfo = rows
        .filter(r => r.workingDay)
        .map(r => ({ days: r.days, startTime: r.startTime, endTime: r.endTime }))
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/util/working/days", { workingInfo })
      toast.success("Working days saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Working Days" description="Setting up working days master">
      {loading ? <CircularProgress size={28} /> : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 1.5, px: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Day</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Start</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>End</Typography>
          </Box>
          {rows.map((row, i) => (
            <Box key={row.days} sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 1.5, alignItems: "center" }}>
              <FormControlLabel
                control={<Checkbox checked={row.workingDay} onChange={(_, v) => updateRow(i, { workingDay: v })} />}
                label={row.days}
              />
              <TextField
                size="small" type="time" value={row.startTime} disabled={!row.workingDay}
                onChange={e => updateRow(i, { startTime: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small" type="time" value={row.endTime} disabled={!row.workingDay}
                onChange={e => updateRow(i, { endTime: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          ))}
          <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start", mt: 1 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      )}
    </SettingsSubShell>
  )
}

const DEFAULT_DASHBOARD_SEQ = [
  { name: "Leads", seq: 1 },
  { name: "Matters", seq: 2 },
  { name: "Tasks", seq: 3 },
  { name: "hearings", seq: 4 },
  { name: "Recent", seq: 5 },
  { name: "clients", seq: 6 },
]

function displayDashboardName(name: string) {
  if (name === "hearings") return "Hearings"
  if (name === "clients") return "Favourite Clients"
  if (name === "Recent") return "Recent Activities"
  return name
}

export function MyDashboardSettingsPage() {
  const [items, setItems] = useState(DEFAULT_DASHBOARD_SEQ)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await adminApi.getSetupInfo() as { sequenceList?: { name?: string; seq?: number; sequence?: number }[] }
        if (cancelled) return
        const list = data?.sequenceList
        if (Array.isArray(list) && list.length) {
          setItems(
            list.map((item, i) => ({
              name: String(item.name ?? `Item ${i + 1}`),
              seq: Number(item.seq ?? item.sequence ?? i + 1),
            })),
          )
        }
      } catch { /* defaults */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  function move(index: number, dir: -1 | 1) {
    setItems(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((item, i) => ({ ...item, seq: i + 1 }))
    })
  }

  async function save() {
    setSaving(true)
    try {
      const sequenceList = items.map((item, i) => ({
        ...item,
        name: item.name,
        seq: i + 1,
        sequence: i + 1,
      }))
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/dashboard/setup", { sequenceList })
      toast.success("Dashboard sequence saved")
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="My Dashboard" description="Customize My dashboard">
      {loading ? <CircularProgress size={28} /> : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reorder dashboard tabs. Sequence is saved when you click Save.
          </Typography>
          <List dense>
            {items.map((item, i) => (
              <ListItem key={item.name} divider
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button size="small" disabled={i === 0} onClick={() => move(i, -1)}>Up</Button>
                    <Button size="small" disabled={i === items.length - 1} onClick={() => move(i, 1)}>Down</Button>
                  </Box>
                }
              >
                <ListItemText
                  primary={`${i + 1}. ${displayDashboardName(item.name)}`}
                  secondary={item.name}
                />
              </ListItem>
            ))}
          </List>
          <Button variant="contained" onClick={save} disabled={saving} sx={{ mt: 2 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      )}
    </SettingsSubShell>
  )
}

const INVOICE_SEQ_FIELDS = [
  "proformaSeq",
  "taxInvoiceSeq",
  "disbursementSeq",
  "disbursementInvoicePrefix",
  "creditNoteSeq",
  "creditNoteInvoicePrefix",
  "writeOffSeq",
  "writeOffInvoicePrefix",
] as const

type InvoiceSeqField = (typeof INVOICE_SEQ_FIELDS)[number]

const EMPTY_INVOICE_SEQ: Record<InvoiceSeqField, string> = {
  proformaSeq: "",
  taxInvoiceSeq: "",
  disbursementSeq: "",
  disbursementInvoicePrefix: "",
  creditNoteSeq: "",
  creditNoteInvoicePrefix: "",
  writeOffSeq: "",
  writeOffInvoicePrefix: "",
}

function labelSeqKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/Seq$/, " Sequence")
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

export function InvoiceSequencePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Record<InvoiceSeqField, string>>(EMPTY_INVOICE_SEQ)
  const [saving, setSaving] = useState(false)

  async function load(y: number) {
    setLoading(true)
    try {
      if (env.USE_STATIC_DATA) {
        setData({ year: y, ...EMPTY_INVOICE_SEQ, proformaSeq: 1, taxInvoiceSeq: 1 })
        return
      }
      const r = await axiosClient.get(`/api/invoice-sequence/get/by-year/${y}`)
      setData((r.data?.data ?? r.data ?? {}) as Record<string, unknown>)
    } catch {
      setData({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(year) }, [year])

  function openEditor() {
    const next = { ...EMPTY_INVOICE_SEQ }
    for (const key of INVOICE_SEQ_FIELDS) {
      const v = data[key]
      next[key] = v == null ? "" : String(v)
    }
    setForm(next)
    setDialogOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { year }
      for (const key of INVOICE_SEQ_FIELDS) {
        const raw = form[key].trim()
        payload[key] = key.endsWith("Prefix") ? raw : Number(raw)
      }
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/invoice-sequence/add", payload)
      toast.success("Invoice sequence saved")
      setDialogOpen(false)
      await load(year)
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  const displayKeys = Object.keys(data).filter(
    k => !["id", "companyId", "companyName", "year"].includes(k),
  )

  return (
    <SettingsSubShell title="Invoice Sequence" description="Configure invoice sequences by year">
      <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
        <InputLabel>Year</InputLabel>
        <Select label="Year" value={year} onChange={e => setYear(Number(e.target.value))}>
          {[0, 1, 2].map(i => (
            <MenuItem key={currentYear - i} value={currentYear - i}>{currentYear - i}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Invoice Sequences for {year}
      </Typography>

      {loading ? <CircularProgress size={28} /> : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 2 }}>
          {displayKeys.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No sequence configured for this year.</Typography>
          ) : displayKeys.map(key => (
            <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">{labelSeqKey(key)}:</Typography>
              <Chip size="small" variant="outlined" label={String(data[key] ?? "N/A")} />
            </Box>
          ))}
        </Box>
      )}

      <Button variant="outlined" color={data.id ? "secondary" : "success"} onClick={openEditor}>
        {data.id ? "Edit" : "Setup"}
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice Sequence Setting</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            {INVOICE_SEQ_FIELDS.map(key => (
              <TextField
                key={key}
                size="small"
                label={labelSeqKey(key)}
                type={key.endsWith("Prefix") ? "text" : "number"}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSubShell>
  )
}

export function CustomFieldsPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customFieldFor, setCustomFieldFor] = useState("Lead")
  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([""])

  const { data = [], isLoading } = useQuery({
    queryKey: ["custom-fields-list"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "cf1", fieldName: "Industry", fieldType: "text", required: false, customFieldFor: "Client", fieldOptions: [] },
        ]
      }
      const r = await axiosClient.get("/api/util/get/custom/field-list-by-type", {
        params: { customFieldFor: "" },
      })
      return r.data?.data ?? r.data ?? []
    },
  })

  function openAdd() {
    setCustomFieldFor("Lead")
    setFieldName("")
    setFieldType("text")
    setRequired(false)
    setOptions([""])
    setDialogOpen(true)
  }

  async function save() {
    if (!fieldName.trim()) { toast.error("Field name is required"); return }
    setSaving(true)
    try {
      const payload = {
        customFieldFor,
        fieldName: fieldName.trim(),
        fieldType,
        required,
        fieldOptions: (fieldType === "dropdown" || fieldType === "radio")
          ? options.map(o => o.trim()).filter(Boolean)
          : [],
      }
      if (!env.USE_STATIC_DATA) await axiosClient.post("/api/util/add/custom-field", payload)
      toast.success("Custom field added")
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ["custom-fields-list"] })
    } catch { toast.error("Failed to add custom field") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Custom Field" description="Custom Field Master">
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Field</Button>
      </Box>
      {isLoading ? <CircularProgress size={28} /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Field Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>For</TableCell>
              <TableCell>Options</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data as {
              id: string; fieldName?: string; fieldType?: string; required?: boolean
              customFieldFor?: string; fieldOptions?: string[]
            }[]).map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.fieldName}</TableCell>
                <TableCell>{row.fieldType}</TableCell>
                <TableCell>{row.required ? "Yes" : "No"}</TableCell>
                <TableCell>{row.customFieldFor}</TableCell>
                <TableCell>
                  {Array.isArray(row.fieldOptions) && row.fieldOptions.length
                    ? row.fieldOptions.join(", ")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {(data as unknown[]).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No custom fields yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Field</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Field For</InputLabel>
              <Select label="Field For" value={customFieldFor} onChange={e => setCustomFieldFor(String(e.target.value))}>
                <MenuItem value="Lead">Lead</MenuItem>
                <MenuItem value="Matter">Matter</MenuItem>
                <MenuItem value="Client">Client</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Field Name" value={fieldName} onChange={e => setFieldName(e.target.value)} required />
            <FormControl size="small" fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select label="Field Type" value={fieldType} onChange={e => setFieldType(String(e.target.value))}>
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="dropdown">Dropdown</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="radio">Radio</MenuItem>
                <MenuItem value="date">Date</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={required} onChange={(_, v) => setRequired(v)} />}
              label="Required"
            />
            {(fieldType === "dropdown" || fieldType === "radio") && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">Options</Typography>
                {options.map((opt, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small" fullWidth label={`Option ${i + 1}`} value={opt}
                      onChange={e => setOptions(prev => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                    />
                    <IconButton
                      size="small"
                      disabled={options.length <= 1}
                      onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" onClick={() => setOptions(prev => [...prev, ""])}>Add option</Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </SettingsSubShell>
  )
}

export function ConflictCheckSettingsPage() {
  const [draft, setDraft] = useState("")
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      if (!env.USE_STATIC_DATA) {
        const r = await axiosClient.get("/api/settings/conflict-check-ignored-tokens")
        const payload = r.data?.data ?? r.data ?? {}
        const tokens = payload?.ignoredNameTokensConflictCheck ?? []
        setList(
          Array.isArray(tokens)
            ? [...new Set(tokens.map((t: unknown) => String(t ?? "").trim()).filter(Boolean))]
            : [],
        )
      }
    } catch { setList([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  function addTerm() {
    const term = draft.trim()
    if (!term) return
    setList(prev => (prev.includes(term) ? prev : [...prev, term]))
    setDraft("")
  }

  async function save() {
    setSaving(true)
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/settings/conflict-check-ignored-tokens/update", list, {
          headers: { "Content-Type": "application/json" },
        })
      }
      toast.success("Excluded terms updated")
      await load()
    } catch { toast.error("Failed to update excluded terms") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Conflict Check Settings" description="Excluded terms for conflict matching">
      {loading ? <CircularProgress size={28} /> : (
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              size="small" fullWidth label="Excluded term" value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTerm()}
            />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addTerm} disabled={!draft.trim()}>
              Add
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, minHeight: 40 }}>
            {list.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No excluded terms yet.</Typography>
            ) : list.map(t => (
              <Chip key={t} label={t} onDelete={() => setList(prev => prev.filter(x => x !== t))} />
            ))}
          </Box>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
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

function formatCategoryLabel(category?: string) {
  return category
    ?.split("_")
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ") || "—"
}

function normalizeTeamRoles(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  const data = raw as { data?: unknown; content?: unknown }
  if (Array.isArray(data?.data)) return data.data as Record<string, unknown>[]
  if (Array.isArray(data?.content)) return data.content as Record<string, unknown>[]
  if (data?.data && typeof data.data === "object" && Array.isArray((data.data as { content?: unknown }).content)) {
    return (data.data as { content: Record<string, unknown>[] }).content
  }
  return []
}

function isRoleActive(row: Record<string, unknown>) {
  if (typeof row.active === "boolean") return row.active
  if (typeof row.status === "boolean") return row.status
  return true
}

export function TeamRolesPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "tr1", description: "Responsible Attorney", category: "HANDLING_WORK", active: true },
          { id: "tr2", description: "Supervisor", category: "SUPERVISOR", active: true },
        ]
      }
      const r = await axiosClient.get("/api/team-role/get/all")
      const roles = normalizeTeamRoles(r.data)
      return [...roles].sort((a, b) => {
        const order = (c: unknown) => {
          if (c === "HANDLING_WORK") return 0
          if (c === "SUPERVISOR") return 1
          return 2
        }
        return order(a.category) - order(b.category)
      })
    },
  })

  async function openDialog(role?: Record<string, unknown>) {
    setEditing(role ?? null)
    setDescription(String(role?.description ?? role?.name ?? ""))
    setCategory(String(role?.category ?? ""))
    setDialogOpen(true)
    try {
      if (env.USE_STATIC_DATA) {
        setCategories(["HANDLING_WORK", "SUPERVISOR", "OTHER"])
        return
      }
      const r = await axiosClient.get("/api/team-role/categories")
      const list = r.data?.data ?? r.data ?? []
      setCategories(Array.isArray(list) ? list.map(String) : [])
    } catch { setCategories([]) }
  }

  async function save() {
    if (!description.trim() || !category) {
      toast.error("Name and category are required")
      return
    }
    setSaving(true)
    try {
      const payload = { description: description.trim(), category }
      if (!env.USE_STATIC_DATA) {
        if (editing?.id) await axiosClient.post("/api/team-role/update", { id: editing.id, ...payload })
        else await axiosClient.post("/api/team-role/add", payload)
      }
      toast.success(editing ? "Team role updated" : "Team role added")
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ["team-roles"] })
    } catch { toast.error("Failed to save team role") }
    finally { setSaving(false) }
  }

  async function toggleStatus(row: Record<string, unknown>, active: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.patch("/api/team-role/status", null, {
          params: { id: row.id, active },
        })
      }
      toast.success(active ? "Role activated" : "Role deactivated")
      qc.invalidateQueries({ queryKey: ["team-roles"] })
    } catch { toast.error("Failed to update status") }
  }

  return (
    <SettingsSubShell title="Team Roles" description="Configure team roles by category for matter assignments">
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => void openDialog()}>Add Role</Button>
      </Box>
      {isLoading ? <CircularProgress size={28} /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data as Record<string, unknown>[]).map(row => (
              <TableRow key={String(row.id)}>
                <TableCell>{String(row.description ?? row.name ?? "—")}</TableCell>
                <TableCell>
                  <Chip size="small" label={formatCategoryLabel(String(row.category ?? ""))} />
                </TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={isRoleActive(row)}
                    onChange={(_, v) => void toggleStatus(row, v)}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => void openDialog(row)} aria-label="Edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? "Edit Team Role" : "Add Team Role"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              size="small" label="Team Role Name" value={description}
              onChange={e => setDescription(e.target.value)} required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={category} onChange={e => setCategory(String(e.target.value))}>
                {categories.map(c => (
                  <MenuItem key={c} value={c}>{formatCategoryLabel(c)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </SettingsSubShell>
  )
}

interface DesignationHoursRow {
  designationId: string
  designationName: string
  hours: number
}

interface EstimateTemplate {
  id?: string
  templateName?: string
  name?: string
  isActive?: boolean
  designationDetails?: DesignationHoursRow[]
  designationDetail?: DesignationHoursRow[]
}

function resolveTemplates(raw: unknown): EstimateTemplate[] {
  const data = raw as { data?: { content?: unknown[]; data?: unknown } } | unknown[]
  if (Array.isArray(data)) return data as EstimateTemplate[]
  const inner = (data as { data?: unknown })?.data
  if (Array.isArray(inner)) return inner as EstimateTemplate[]
  if (inner && typeof inner === "object" && Array.isArray((inner as { content?: unknown[] }).content)) {
    return (inner as { content: EstimateTemplate[] }).content
  }
  return []
}

export function EstimatedHoursPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [rows, setRows] = useState<DesignationHoursRow[]>([])
  const [selectedDesignationId, setSelectedDesignationId] = useState("")
  const [hoursInput, setHoursInput] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["estimate-hours-templates"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          {
            id: "t1",
            templateName: "Standard",
            isActive: true,
            designationDetails: [{ designationId: "d1", designationName: "Associate", hours: 10 }],
          },
        ] as EstimateTemplate[]
      }
      const r = await axiosClient.get("/api/estimate-hours-by-designation/get/template", {
        params: { pageNumber: 0, pageSize: 50, isActiveFilter: "ALL" },
      })
      return resolveTemplates(r.data)
    },
  })

  const { data: designations = [] } = useQuery({
    queryKey: ["designations-for-estimate"],
    queryFn: () => adminApi.getDesignations() as Promise<{ id: string; name: string }[]>,
  })

  function openAdd() {
    setEditingId(null)
    setTemplateName("")
    setIsActive(true)
    setRows([])
    setSelectedDesignationId("")
    setHoursInput("")
    setDialogOpen(true)
  }

  async function openEdit(tpl: EstimateTemplate) {
    const id = String(tpl.id ?? "")
    setEditingId(id)
    setTemplateName(tpl.templateName || tpl.name || "")
    setIsActive(tpl.isActive !== false)
    setSelectedDesignationId("")
    setHoursInput("")
    setDialogOpen(true)
    try {
      if (env.USE_STATIC_DATA) {
        setRows(tpl.designationDetails ?? [])
        return
      }
      const r = await axiosClient.get(`/api/estimate-hours-by-designation/get/template/${id}`)
      const full = (r.data?.data ?? r.data ?? tpl) as EstimateTemplate
      const details = full.designationDetails ?? full.designationDetail ?? []
      setRows(details.map(d => ({
        designationId: String(d.designationId),
        designationName: String(d.designationName ?? ""),
        hours: Number(d.hours ?? 0),
      })))
    } catch {
      setRows(tpl.designationDetails ?? tpl.designationDetail ?? [])
    }
  }

  function addDesignationRow() {
    if (!selectedDesignationId || !hoursInput.trim()) return
    const hours = Number(hoursInput)
    if (!(hours > 0)) {
      toast.error("Hours must be greater than 0")
      return
    }
    const desig = (designations as { id: string; name: string }[]).find(d => d.id === selectedDesignationId)
    if (!desig) return
    if (rows.some(r => r.designationId === selectedDesignationId)) {
      toast.error("Designation already added")
      return
    }
    setRows(prev => [...prev, { designationId: desig.id, designationName: desig.name, hours }])
    setSelectedDesignationId("")
    setHoursInput("")
  }

  async function saveTemplate() {
    const name = templateName.trim()
    if (!name) { toast.error("Template name is required"); return }
    const designationDetails = rows.filter(r => r.hours > 0)
    if (!designationDetails.length) { toast.error("Add at least one designation with hours"); return }

    setSaving(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        templateName: name,
        isActive,
        designationDetails,
      }
      if (!env.USE_STATIC_DATA) {
        if (editingId) await axiosClient.put("/api/estimate-hours-by-designation/update/template", payload)
        else await axiosClient.post("/api/estimate-hours-by-designation/add/template", payload)
      }
      toast.success(editingId ? "Template updated" : "Template created")
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ["estimate-hours-templates"] })
    } catch { toast.error("Failed to save template") }
    finally { setSaving(false) }
  }

  return (
    <SettingsSubShell title="Estimated Hours by Designation" description="Manage estimated hours templates">
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Template</Button>
      </Box>
      {isLoading ? <CircularProgress size={28} /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Template</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Designations</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(templates as EstimateTemplate[]).map(tpl => {
              const details = tpl.designationDetails ?? tpl.designationDetail ?? []
              return (
                <TableRow key={String(tpl.id)}>
                  <TableCell>{tpl.templateName || tpl.name || "—"}</TableCell>
                  <TableCell>{tpl.isActive === false ? "No" : "Yes"}</TableCell>
                  <TableCell>{details.length}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => void openEdit(tpl)} aria-label="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {(templates as EstimateTemplate[]).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">No templates yet.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Template" : "Add Template"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              size="small" label="Template name" value={templateName}
              onChange={e => setTemplateName(e.target.value)} required
            />
            {editingId && (
              <FormControlLabel
                control={<Switch checked={isActive} onChange={(_, v) => setIsActive(v)} />}
                label="Active"
              />
            )}
            <Divider />
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Designation</InputLabel>
                <Select
                  label="Designation"
                  value={selectedDesignationId}
                  onChange={e => setSelectedDesignationId(String(e.target.value))}
                >
                  {(designations as { id: string; name: string }[]).map(d => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small" label="Hours" type="number" value={hoursInput}
                onChange={e => setHoursInput(e.target.value)} sx={{ width: 100 }}
              />
              <Button variant="outlined" onClick={addDesignationRow}>Add</Button>
            </Box>
            <List dense>
              {rows.map(r => (
                <ListItem key={r.designationId} divider
                  secondaryAction={
                    <IconButton edge="end" onClick={() => setRows(prev => prev.filter(x => x.designationId !== r.designationId))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={r.designationName} secondary={`${r.hours} hours`} />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTemplate} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSubShell>
  )
}

export function AnalyticsPermissionsPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const [tableData, setTableData] = useState<{ departmentId: string; departmentName: string; budgetEnabled: boolean }[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [departmentId, setDepartmentId] = useState("")
  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-analytics"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "d1", name: "Litigation" }, { id: "d2", name: "Corporate" }]
      const r = await axiosClient.get("/api/util/list/department")
      return r.data?.data ?? r.data ?? []
    },
  })

  async function loadPermissions(uid: string) {
    setLoading(true)
    try {
      if (env.USE_STATIC_DATA) {
        setTableData([{ departmentId: "d1", departmentName: "Litigation", budgetEnabled: true }])
        return
      }
      const r = await axiosClient.get(`/api/analytics/dashboard/analytics-permissions/get/${uid}`)
      const perms = (r.data?.data?.departments ?? []) as { departmentId: string; budgeting?: boolean }[]
      setTableData(perms.map(dep => ({
        departmentId: dep.departmentId,
        departmentName: (departments as { id: string; name: string }[]).find(d => d.id === dep.departmentId)?.name ?? "",
        budgetEnabled: !!dep.budgeting,
      })))
    } catch { setTableData([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!userId) { setTableData([]); return }
    void loadPermissions(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, departments])

  async function persist(departmentsPayload: { departmentId: string; budgeting: boolean }[]) {
    if (!userId) return
    if (!env.USE_STATIC_DATA) {
      await axiosClient.post(
        `/api/analytics/dashboard/analytics-permissions/createOrUpdate/${userId}`,
        { departments: departmentsPayload },
      )
    }
    await loadPermissions(userId)
  }

  async function saveDialog() {
    if (!userId || !departmentId) return
    setSaving(true)
    try {
      const existing = tableData.map(d => ({ departmentId: d.departmentId, budgeting: d.budgetEnabled }))
      const idx = existing.findIndex(d => d.departmentId === departmentId)
      if (idx >= 0) existing[idx].budgeting = budgetEnabled
      else existing.push({ departmentId, budgeting: budgetEnabled })
      await persist(existing)
      toast.success("Permissions saved")
      setDialogOpen(false)
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  async function removeDept(deptId: string) {
    try {
      await persist(
        tableData
          .filter(d => d.departmentId !== deptId)
          .map(d => ({ departmentId: d.departmentId, budgeting: d.budgetEnabled })),
      )
      toast.success("Department removed")
    } catch { toast.error("Failed to remove") }
  }

  return (
    <SettingsSubShell title="Analytics Permissions" description="Configure Permissions for Analytics">
      <Box sx={{ mb: 2, maxWidth: 360 }}>
        <UserSelectFilter value={userId} onChange={setUserId} label="User" />
      </Box>

      {!userId ? (
        <Typography variant="body2" color="text.secondary">Select a user to manage analytics department permissions.</Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={() => { setDepartmentId(""); setBudgetEnabled(false); setDialogOpen(true) }}
            >
              Add Department
            </Button>
          </Box>
          {loading ? <CircularProgress size={28} /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Department</TableCell>
                  <TableCell>Budgeting</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map(row => (
                  <TableRow key={row.departmentId}>
                    <TableCell>{row.departmentName || row.departmentId}</TableCell>
                    <TableCell>{row.budgetEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDepartmentId(row.departmentId)
                          setBudgetEnabled(row.budgetEnabled)
                          setDialogOpen(true)
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => void removeDept(row.departmentId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {tableData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">No department permissions yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Department Permission</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Department</InputLabel>
              <Select label="Department" value={departmentId} onChange={e => setDepartmentId(String(e.target.value))}>
                {(departments as { id: string; name: string }[]).map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={budgetEnabled} onChange={(_, v) => setBudgetEnabled(v)} />}
              label="Budgeting enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveDialog} disabled={saving || !departmentId}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSubShell>
  )
}
