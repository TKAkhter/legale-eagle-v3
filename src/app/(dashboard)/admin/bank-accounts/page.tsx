import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import StarIcon from "@mui/icons-material/Star"
import ToggleOnIcon from "@mui/icons-material/ToggleOn"
import ToggleOffIcon from "@mui/icons-material/ToggleOff"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SearchInput } from "@components/filters"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { bankAccountsApi } from "@/api/bankAccounts"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

type AccountForm = {
  accountName: string
  accountNumber: string
  accountType: string
  bankName: string
  currency: string
  openingBalance: string
  defaultAccount: boolean
}

function AccountFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState(filters)
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
      <SearchInput
        value={String(f.searchText ?? "")}
        onChange={v => setF(p => ({ ...p, searchText: v }))}
        placeholder="Search accounts…"
      />
      <Button variant="contained" size="small" onClick={() => onSearch(f)}>Search</Button>
      <Button size="small" onClick={() => { setF({}); onReset() }}>Reset</Button>
    </Box>
  )
}

function AccountFormDrawer({
  open,
  onClose,
  onSuccess,
  account,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  account?: Record<string, unknown> | null
}) {
  const isEdit = !!account?.id
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<AccountForm>({
    defaultValues: {
      accountName: "",
      accountNumber: "",
      accountType: "Current",
      bankName: "",
      currency: "AED",
      openingBalance: "0",
      defaultAccount: true,
    },
  })
  const defaultAccount = watch("defaultAccount")

  useEffect(() => {
    if (!open) {
      reset()
      setSubmitError(null)
      return
    }
    if (account) {
      reset({
        accountName: String(account.accountName ?? ""),
        accountNumber: String(account.accountNumber ?? ""),
        accountType: String(account.accountType ?? "Current"),
        bankName: String(account.bankName ?? ""),
        currency: String(account.currency ?? "AED"),
        openingBalance: String(account.openingBalance ?? "0"),
        defaultAccount: Boolean(account.defaultAccount),
      })
    } else {
      reset({
        accountName: "",
        accountNumber: "",
        accountType: "Current",
        bankName: "",
        currency: "AED",
        openingBalance: "0",
        defaultAccount: true,
      })
    }
  }, [open, account, reset])

  async function onSubmit(data: AccountForm) {
    setSubmitError(null)
    if (!data.accountName.trim()) { setSubmitError("Account name is required"); return }
    if (!data.accountNumber.trim()) { setSubmitError("Account number is required"); return }
    if (!data.bankName.trim()) { setSubmitError("Bank name is required"); return }
    if (!data.accountType) { setSubmitError("Account type is required"); return }
    if (!data.currency) { setSubmitError("Currency is required"); return }
    try {
      const payload = {
        ...data,
        openingBalance: Number(data.openingBalance) || 0,
        active: account?.active !== false,
      }
      const msg = isEdit
        ? await bankAccountsApi.update(String(account!.id), payload)
        : await bankAccountsApi.create(payload)
      toast.success(msg)
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? (isEdit ? "Failed to update account" : "Failed to add account"),
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Bank Account" : "Add Bank Account"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Account">
        <ControlledInput name="accountName" control={control} label="Account Name" required />
        <ControlledInput name="accountNumber" control={control} label="Account Number" required />
        <ControlledSelect
          name="accountType"
          control={control}
          label="Account Type"
          options={[
            { value: "Current", label: "Current" },
            { value: "Savings", label: "Savings" },
          ]}
        />
        <ControlledInput name="bankName" control={control} label="Bank Name" required />
        <ControlledSelect
          name="currency"
          control={control}
          label="Currency"
          options={[
            { value: "AED", label: "AED" },
            { value: "USD", label: "USD" },
          ]}
        />
        <ControlledInput name="openingBalance" control={control} label="Opening Balance" required />
        <FormControlLabel
          control={<Checkbox checked={defaultAccount} onChange={e => setValue("defaultAccount", e.target.checked)} />}
          label="Default account"
        />
      </FormSection>
    </FormDrawer>
  )
}

function TransactionsDialog({
  open,
  onClose,
  account,
}: {
  open: boolean
  onClose: () => void
  account: Record<string, unknown> | null
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !account?.id) return
    setLoading(true)
    bankAccountsApi.getTransactions(String(account.id))
      .then(list => setRows(list as Record<string, unknown>[]))
      .catch(() => toast.error("Failed to load transactions"))
      .finally(() => setLoading(false))
  }, [open, account])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Transactions — {String(account?.accountName ?? "")}
      </DialogTitle>
      <DialogContent dividers>
        {loading && <Box sx={{ py: 2, textAlign: "center" }}>Loading…</Box>}
        {!loading && rows.length === 0 && (
          <Box sx={{ py: 2, textAlign: "center", color: "text.secondary" }}>No transactions.</Box>
        )}
        {!loading && rows.length > 0 && (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Date", "Description", "Debit", "Credit", "Balance"].map(h => (
                  <Box component="th" key={h} sx={{ px: 1.5, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map((r, i) => (
                <Box component="tr" key={String(r.id ?? i)} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{formatDate(String(r.transactionDate ?? r.date ?? ""))}</Box>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{String(r.description ?? r.note ?? "—")}</Box>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{formatCurrency(Number(r.debit ?? 0))}</Box>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{formatCurrency(Number(r.credit ?? 0))}</Box>
                  <Box component="td" sx={{ px: 1.5, py: 1, fontSize: 13 }}>{formatCurrency(Number(r.balance ?? 0))}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function BankAccountsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Record<string, unknown> | null>(null)
  const [txAccount, setTxAccount] = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [gridKey, setGridKey] = useState(0)

  function refresh() {
    qc.invalidateQueries({ queryKey: ["bank-accounts"] })
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title={t("nav.bankAccounts")}
      description={t("pages.bankAccountsDesc")}
      action={(
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditAccount(null); setDrawerOpen(true) }}
        >
          Add Account
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "accountName", header: "Account Name" },
          { field: "accountNumber", header: "Account Number" },
          { field: "accountType", header: "Type" },
          { field: "bankName", header: "Bank" },
          { field: "currency", header: "Currency" },
          {
            field: "openingBalance",
            header: "Opening Balance",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "defaultAccount",
            header: "Default",
            renderCell: v => (v ? <Chip size="small" color="primary" label="Default" /> : "—"),
          },
          {
            field: "active",
            header: "Status",
            width: 110,
            renderCell: (v, row) => {
              const active = v !== false && (row as { status?: string }).status !== "INACTIVE"
              return (
                <Chip
                  size="small"
                  label={active ? "Active" : "Inactive"}
                  color={active ? "success" : "default"}
                  variant="outlined"
                />
              )
            },
          },
        ]}
        queryKey={["bank-accounts", "list"]}
        queryFn={(p: GridParams) => bankAccountsApi.getAll(p)}
        FilterPanel={AccountFilters}
        hasFilters
        zebraStriping
        rowMenuItems={(row) => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          const isDefault = Boolean(r.defaultAccount)
          const active = r.active !== false && r.status !== "INACTIVE"
          return [
            { label: "Transactions", onClick: () => setTxAccount(r) },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => { setEditAccount(r); setDrawerOpen(true) },
            },
            ...(!isDefault ? [{
              label: "Set as Default",
              icon: <StarIcon fontSize="small" />,
              onClick: async () => {
                try {
                  toast.success(await bankAccountsApi.setDefault(id, r))
                  refresh()
                } catch (e: unknown) {
                  toast.error(
                    (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
                    ?? (e as { message?: string })?.message
                    ?? "Failed to set default",
                  )
                }
              },
            }] : []),
            {
              label: active ? "Deactivate" : "Activate",
              icon: active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />,
              onClick: async () => {
                try {
                  toast.success(await bankAccountsApi.setActive(id, r, !active))
                  refresh()
                } catch (e: unknown) {
                  toast.error(
                    (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
                    ?? (e as { message?: string })?.message
                    ?? "Failed to update status",
                  )
                }
              },
            },
            {
              label: "Delete",
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => setDeleteTarget(r),
            },
          ]
        }}
      />
      <AccountFormDrawer
        open={drawerOpen}
        account={editAccount}
        onClose={() => { setDrawerOpen(false); setEditAccount(null) }}
        onSuccess={refresh}
      />
      <TransactionsDialog
        open={!!txAccount}
        account={txAccount}
        onClose={() => setTxAccount(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Bank Account"
        message={`Delete “${String(deleteTarget?.accountName ?? "")}”? This cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        onConfirm={async () => {
          if (!deleteTarget?.id) return
          try {
            toast.success(await bankAccountsApi.remove(String(deleteTarget.id)))
            refresh()
          } catch (e: unknown) {
            toast.error(
              (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
              ?? (e as { message?: string })?.message
              ?? "Failed to delete account",
            )
          }
        }}
      />
    </PageShell>
  )
}
