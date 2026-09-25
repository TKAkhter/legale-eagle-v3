import { useEffect, useState } from "react"
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { SearchInput } from "@components/filters"
import { vendorsApi } from "@/api/vendors"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
import { VendorFormDrawer } from "./_components/VendorFormDrawer"

function VendorFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState(filters)
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
      <SearchInput
        value={String(f.searchText ?? "")}
        onChange={v => setF(p => ({ ...p, searchText: v }))}
        placeholder="Search vendors…"
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
    </Box>
  )
}

function primaryContact(row: Record<string, unknown>) {
  const contacts = (row.contactPersons ?? []) as Record<string, unknown>[]
  const primary = contacts.find(c => c.primary) ?? contacts[0]
  if (!primary) return "—"
  return `${primary.firstName ?? ""} ${primary.lastName ?? ""}`.trim() || "—"
}

function primaryEmail(row: Record<string, unknown>) {
  const contacts = (row.contactPersons ?? []) as Record<string, unknown>[]
  const primary = contacts.find(c => c.primary) ?? contacts[0]
  if (!primary) return "—"
  const email = primary.email
  if (typeof email === "string") return email
  return String((email as { emailId?: string })?.emailId ?? "—")
}

export default function VendorsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [gridKey, setGridKey] = useState(0)
  const [confirm, setConfirm] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const edit = searchParams.get("edit")
    if (edit) {
      setEditId(edit)
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function applyStatus() {
    if (!confirm) return
    setToggling(true)
    try {
      toast.success(await vendorsApi.setStatus(confirm.id, !confirm.active))
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["vendors"] })
      setConfirm(null)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? "Failed to update status")
    } finally {
      setToggling(false)
    }
  }

  return (
    <PageShell
      title={t("nav.vendors")}
      description={t("pages.vendorsDesc")}
      action={(
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditId(undefined); setDrawerOpen(true) }}
        >
          New Vendor
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "displayName", header: "Vendor Name", renderCell: (v, row) => String(v || (row as Record<string, unknown>).companyName || "—") },
          { field: "companyName", header: "Company" },
          { field: "vendorType", header: "Type", renderCell: v => <Chip size="small" label={String(v ?? "—")} variant="outlined" /> },
          { field: "trnNo", header: "TRN", renderCell: v => String(v || "—") },
          {
            field: "contactPersons",
            header: "Contact",
            renderCell: (_v, row) => primaryContact(row as Record<string, unknown>),
          },
          {
            field: "email",
            header: "Email",
            renderCell: (_v, row) => primaryEmail(row as Record<string, unknown>),
          },
          {
            field: "active",
            header: "Status",
            renderCell: v => (
              <Chip
                size="small"
                label={v === false ? "Inactive" : "Active"}
                color={v === false ? "default" : "success"}
                variant="outlined"
              />
            ),
          },
        ]}
        queryKey={["vendors", "list"]}
        queryFn={(p: GridParams) => vendorsApi.getAll(p)}
        FilterPanel={VendorFilters}
        hasFilters
        syncWithUrl
        zebraStriping
        detailPath={(row) => `/vendors/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={(row) => {
          const id = String((row as { id?: string }).id ?? "")
          const active = (row as { active?: boolean }).active !== false
          const name = String((row as { displayName?: string; companyName?: string }).displayName
            || (row as { companyName?: string }).companyName
            || "Vendor")
          return [
            { label: "Details", onClick: () => navigate(`/vendors/${id}`) },
            { label: "Edit", onClick: () => { setEditId(id); setDrawerOpen(true) } },
            {
              label: active ? "Deactivate" : "Activate",
              onClick: () => setConfirm({ id, active, name }),
            },
          ]
        }}
      />
      <VendorFormDrawer
        open={drawerOpen}
        vendorId={editId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(id) => {
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["vendors"] })
          if (id && !editId) navigate(`/vendors/${id}`)
        }}
      />
      <Dialog open={Boolean(confirm)} onClose={() => !toggling && setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm?.active ? "Deactivate Vendor" : "Activate Vendor"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirm?.active
              ? `Deactivate “${confirm?.name}”? They will be hidden from active lists.`
              : `Activate “${confirm?.name}”?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={toggling} onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="contained" disabled={toggling} onClick={() => { void applyStatus() }}>
            {confirm?.active ? "Deactivate" : "Activate"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
