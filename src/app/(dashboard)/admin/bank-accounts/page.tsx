import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, TextField,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
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

function AddAccountDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
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

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function onSubmit(data: AccountForm) {
    setSubmitError(null)
    if (!data.accountName.trim()) { setSubmitError("Account name is required"); return }
    try {
      toast.success(await bankAccountsApi.create({
        ...data,
        openingBalance: Number(data.openingBalance) || 0,
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to add account",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Add Bank Account"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      width={440}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Account">
        <ControlledInput name="accountName" control={control} label="Account Name" required />
        <ControlledInput name="accountNumber" control={control} label="Account Number" />
        <ControlledSelect
          name="accountType"
          control={control}
          label="Account Type"
          options={[
            { value: "Current", label: "Current" },
            { value: "Savings", label: "Savings" },
            { value: "Trust", label: "Trust" },
          ]}
        />
        <ControlledInput name="bankName" control={control} label="Bank Name" />
        <ControlledSelect
          name="currency"
          control={control}
          label="Currency"
          options={[
            { value: "AED", label: "AED" },
            { value: "USD", label: "USD" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
          ]}
        />
        <ControlledInput name="openingBalance" control={control} label="Opening Balance" />
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
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [txAccount, setTxAccount] = useState<Record<string, unknown> | null>(null)
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title="Bank Accounts"
      description="Firm bank accounts and transactions"
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
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
            renderCell: v => (v ? "Yes" : "—"),
          },
        ]}
        queryKey={["bank-accounts", "list"]}
        queryFn={(p: GridParams) => bankAccountsApi.getAll(p)}
        FilterPanel={AccountFilters}
        hasFilters
        zebraStriping
        rowMenuItems={(row) => [
          { label: "Transactions", onClick: () => setTxAccount(row as Record<string, unknown>) },
        ]}
      />
      <AddAccountDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["bank-accounts"] })
          setGridKey(k => k + 1)
        }}
      />
      <TransactionsDialog
        open={!!txAccount}
        account={txAccount}
        onClose={() => setTxAccount(null)}
      />
    </PageShell>
  )
}
