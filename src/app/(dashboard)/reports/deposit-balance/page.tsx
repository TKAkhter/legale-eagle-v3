import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function DepositBalanceReportPage() {
  return (
    <SimpleReportPage
      title="Deposit Balance"
      description="Retainer / deposit balances by LFA"
      queryKey={["reports", "deposit-balance"]}
      queryFn={p => reportsApi.getDepositBalance(p)}
      emailExcelFn={f => reportsApi.requestDepositBalanceExcel(f)}
      filters={{ showClient: true }}
      columns={[
        { field: "clientName", header: "Client", sortKey: "clientName" },
        { field: "agreementNo", header: "LFA", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "balance", header: "Balance", align: "right", renderCell: (v, row) => formatCurrency(Number(v ?? (row as { depositBalance?: number }).depositBalance ?? 0)) },
        { field: "currency", header: "Currency", renderCell: v => String(v || "AED") },
      ]}
    />
  )
}
