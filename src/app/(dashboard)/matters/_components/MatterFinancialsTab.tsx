import { useState } from "react"
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { bankAccountsApi } from "@/api/bankAccounts"
import { mattersApi } from "@/api/matters"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"

interface Props {
  matterId: string
}

/** Matter bank transactions (LMS Financials / transactions tab). */
export function MatterFinancialsTab({ matterId }: Props) {
  const [bankAccountId, setBankAccountId] = useState("")

  const banksQuery = useQuery({
    queryKey: ["bank-accounts", "matter-financials"],
    queryFn: () => bankAccountsApi.getAll({ page: 0, pageSize: 100 }),
  })

  const banks = banksQuery.data?.content ?? []

  return (
    <Box>
      <FormControl size="small" sx={{ mb: 2, minWidth: 240 }}>
        <InputLabel>Bank Account</InputLabel>
        <Select
          label="Bank Account"
          value={bankAccountId}
          onChange={e => setBankAccountId(e.target.value)}
        >
          {banks.map(b => (
            <MenuItem key={String(b.id)} value={String(b.id)}>
              {String(b.accountName ?? b.bankName ?? b.id)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!bankAccountId ? (
        <Box sx={{ py: 3, color: "text.secondary", fontSize: 14 }}>Select a bank account to view transactions</Box>
      ) : (
        <DataGrid
          columns={[
            { field: "transactionDate", header: "Date", renderCell: (v, row) => formatDate(String(v ?? (row as { date?: string }).date ?? "")) },
            { field: "description", header: "Description", renderCell: v => String(v || "—") },
            { field: "debit", header: "Debit", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
            { field: "credit", header: "Credit", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
            { field: "balance", header: "Balance", align: "right", renderCell: v => v != null ? formatCurrency(Number(v)) : "—" },
          ]}
          queryKey={["matters", "transactions", matterId, bankAccountId]}
          queryFn={(p: GridParams) => mattersApi.getTransactions(matterId, bankAccountId, p)}
          zebraStriping
        />
      )}
    </Box>
  )
}
