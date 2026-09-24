import { useMemo, useState } from "react"
import {
  Box, Button, LinearProgress, MenuItem, Paper, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { zohoApi } from "@/api/zoho"
import { toast } from "@/lib/toast"

const BILLING_TYPES = ["Hourly", "Fixed", "Session", "Expense", "Translation", "Courier"]

export default function ZohoLedgersPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: ["zoho", "ledgers"],
    queryFn: () => zohoApi.getLedgers(),
  })
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => zohoApi.getDepartments(),
  })

  const deptMap = useMemo(() => {
    const m = new Map<string, string>()
    ;(departments as Record<string, string>[]).forEach(d => m.set(d.id, d.name))
    return m
  }, [departments])

  const filtered = useMemo(() => {
    const list = rows as Record<string, unknown>[]
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(r =>
      String(r.account_name ?? "").toLowerCase().includes(q)
      || String(r.billingType ?? "").toLowerCase().includes(q)
      || String(deptMap.get(String(r.departmentId ?? "")) ?? "").toLowerCase().includes(q),
    )
  }, [rows, search, deptMap])

  function startAdd() {
    setEditId("new")
    setEditRow({ departmentId: "", billingType: "Hourly", account_name: "", account_id: "", tax_id: "" })
  }

  function startEdit(row: Record<string, unknown>) {
    setEditId(String(row.id))
    setEditRow({
      departmentId: String(row.departmentId ?? ""),
      billingType: String(row.billingType ?? ""),
      account_name: String(row.account_name ?? ""),
      account_id: String(row.account_id ?? ""),
      tax_id: String(row.tax_id ?? ""),
    })
  }

  async function save() {
    if (!editRow.departmentId || !editRow.billingType || !editRow.account_name) {
      toast.error("Department, billing type, and account name are required")
      return
    }
    setSaving(true)
    try {
      toast.success(await zohoApi.saveLedger(editRow))
      setEditId(null)
      qc.invalidateQueries({ queryKey: ["zoho", "ledgers"] })
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title="Zoho Ledgers"
      description="Map departments and billing types to Zoho ledger accounts"
      breadcrumbs={[{ label: "Settings", path: "/admin/settings" }, { label: "Zoho Ledgers" }]}
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={startAdd} disabled={editId === "new"}>
          Add Ledger
        </Button>
      )}
    >
      <Box sx={{ mb: 2 }}>
        <TextField size="small" label="Search" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }} />
      </Box>
      {(isLoading || isFetching) && <LinearProgress sx={{ mb: 1 }} />}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: "action.hover" }}>
              {["Department", "Billing Type", "Account Name", "Account ID", "Tax ID", ""].map(h => (
                <Box component="th" key={h || "a"} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {editId === "new" && (
              <EditRow
                editRow={editRow}
                setEditRow={setEditRow}
                departments={departments as Record<string, string>[]}
                saving={saving}
                onSave={save}
                onCancel={() => setEditId(null)}
              />
            )}
            {filtered.map(r => {
              const id = String(r.id)
              if (editId === id) {
                return (
                  <EditRow
                    key={id}
                    editRow={editRow}
                    setEditRow={setEditRow}
                    departments={departments as Record<string, string>[]}
                    saving={saving}
                    onSave={save}
                    onCancel={() => setEditId(null)}
                  />
                )
              }
              return (
                <Box component="tr" key={id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{deptMap.get(String(r.departmentId ?? "")) ?? String(r.departmentName ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.billingType ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.account_name ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.account_id ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>{String(r.tax_id ?? "—")}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Button size="small" onClick={() => startEdit(r)}>Edit</Button>
                  </Box>
                </Box>
              )
            })}
            {!filtered.length && !isLoading && (
              <Box component="tr">
                <Box component="td" colSpan={6} sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No ledgers found.</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </PageShell>
  )
}

function EditRow({
  editRow, setEditRow, departments, saving, onSave, onCancel,
}: {
  editRow: Record<string, string>
  setEditRow: (fn: (p: Record<string, string>) => Record<string, string>) => void
  departments: Record<string, string>[]
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <Box component="tr" sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
      <Box component="td" sx={{ px: 1, py: 1 }}>
        <TextField select size="small" fullWidth value={editRow.departmentId} onChange={e => setEditRow(p => ({ ...p, departmentId: e.target.value }))}>
          {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
        </TextField>
      </Box>
      <Box component="td" sx={{ px: 1, py: 1 }}>
        <TextField select size="small" fullWidth value={editRow.billingType} onChange={e => setEditRow(p => ({ ...p, billingType: e.target.value }))}>
          {BILLING_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Box>
      <Box component="td" sx={{ px: 1, py: 1 }}>
        <TextField size="small" fullWidth value={editRow.account_name} onChange={e => setEditRow(p => ({ ...p, account_name: e.target.value }))} />
      </Box>
      <Box component="td" sx={{ px: 1, py: 1 }}>
        <TextField size="small" fullWidth value={editRow.account_id} onChange={e => setEditRow(p => ({ ...p, account_id: e.target.value }))} />
      </Box>
      <Box component="td" sx={{ px: 1, py: 1 }}>
        <TextField size="small" fullWidth value={editRow.tax_id} onChange={e => setEditRow(p => ({ ...p, tax_id: e.target.value }))} />
      </Box>
      <Box component="td" sx={{ px: 1, py: 1, whiteSpace: "nowrap" }}>
        <Button size="small" variant="contained" disabled={saving} onClick={onSave}>Save</Button>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  )
}
