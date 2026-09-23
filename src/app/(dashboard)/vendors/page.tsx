import { useEffect, useState } from "react"
import { Alert, Box, Button, Chip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { SearchInput } from "@components/filters"
import { vendorsApi } from "@/api/vendors"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

type VendorForm = {
  displayName: string
  companyName: string
  vendorType: string
  trnNo: string
  note: string
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
}

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

function VendorFormDrawer({
  open,
  onClose,
  vendorId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  vendorId?: string
  onSuccess?: (id?: string) => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<VendorForm>({
    defaultValues: {
      displayName: "",
      companyName: "",
      vendorType: "COMPANY",
      trnNo: "",
      note: "",
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
      contactPhone: "",
    },
  })

  useEffect(() => {
    if (!open) { reset(); return }
    if (!vendorId) return
    vendorsApi.getById(vendorId).then(v => {
      const row = v as Record<string, unknown>
      const contacts = (row.contactPersons ?? []) as Record<string, unknown>[]
      const c = contacts.find(x => x.primary) ?? contacts[0] ?? {}
      const email = c.email
      const phone = c.phone
      reset({
        displayName: String(row.displayName ?? ""),
        companyName: String(row.companyName ?? ""),
        vendorType: String(row.vendorType ?? "COMPANY"),
        trnNo: String(row.trnNo ?? ""),
        note: String(row.note ?? ""),
        contactFirstName: String(c.firstName ?? ""),
        contactLastName: String(c.lastName ?? ""),
        contactEmail: typeof email === "string" ? email : String((email as { emailId?: string })?.emailId ?? ""),
        contactPhone: typeof phone === "string" ? phone : String((phone as { phoneNo?: string })?.phoneNo ?? ""),
      })
    }).catch(() => undefined)
  }, [open, vendorId, reset])

  async function onSubmit(data: VendorForm) {
    setSubmitError(null)
    if (!data.displayName.trim() && !data.companyName.trim()) {
      setSubmitError("Display name or company name is required")
      return
    }
    const payload = {
      displayName: data.displayName.trim() || data.companyName.trim(),
      companyName: data.companyName.trim() || data.displayName.trim(),
      vendorType: data.vendorType,
      trnNo: data.trnNo,
      note: data.note,
      contactPersons: [{
        firstName: data.contactFirstName,
        lastName: data.contactLastName,
        email: { emailId: data.contactEmail, primary: true },
        phone: { codeNo: "+971", phoneNo: data.contactPhone, primary: true },
        primary: true,
      }],
    }
    try {
      if (vendorId) {
        await vendorsApi.update(vendorId, payload)
        toast.success("Vendor updated")
        onSuccess?.(vendorId)
      } else {
        const created = await vendorsApi.create(payload) as { id?: string }
        toast.success("Vendor created")
        onSuccess?.(created?.id)
      }
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save vendor",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={vendorId ? "Edit Vendor" : "New Vendor"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={vendorId ? "Update" : "Create"}
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Vendor">
        <ControlledInput name="displayName" control={control} label="Display Name" required />
        <ControlledInput name="companyName" control={control} label="Company Name" />
        <ControlledSelect
          name="vendorType"
          control={control}
          label="Vendor Type"
          options={[
            { value: "COMPANY", label: "Company" },
            { value: "INDIVIDUAL", label: "Individual" },
          ]}
        />
        <ControlledInput name="trnNo" control={control} label="TRN No" />
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
      </FormSection>
      <FormSection title="Primary Contact">
        <ControlledInput name="contactFirstName" control={control} label="First Name" />
        <ControlledInput name="contactLastName" control={control} label="Last Name" />
        <ControlledInput name="contactEmail" control={control} label="Email" />
        <ControlledInput name="contactPhone" control={control} label="Phone" />
      </FormSection>
    </FormDrawer>
  )
}

export default function VendorsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    const edit = searchParams.get("edit")
    if (edit) {
      setEditId(edit)
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <PageShell
      title="Vendors"
      description="Suppliers and third-party vendors"
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
          return [
            { label: "Details", onClick: () => navigate(`/vendors/${id}`) },
            { label: "Edit", onClick: () => { setEditId(id); setDrawerOpen(true) } },
            {
              label: active ? "Deactivate" : "Activate",
              onClick: async () => {
                toast.success(await vendorsApi.setStatus(id, !active))
                setGridKey(k => k + 1)
                qc.invalidateQueries({ queryKey: ["vendors"] })
              },
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
    </PageShell>
  )
}
