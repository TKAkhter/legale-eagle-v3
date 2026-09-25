import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"

export default function ReferralReportPage() {
  return (
    <SimpleReportPage
      title="Referral Report"
      description="Referral party amounts and sources"
      queryKey={["reports", "referral"]}
      queryFn={p => reportsApi.getReferralReport(p)}
      emailExcelFn={f => reportsApi.requestReferralReportExcel(f)}
      filters={{ showClient: true, showDateRange: true }}
      columns={[
        { field: "referralParty", header: "Referral Party", sortKey: "referralParty", renderCell: (v, row) => String(v ?? (row as { referralName?: string }).referralName ?? "—") },
        { field: "referralSource", header: "Source", renderCell: v => String(v || "—") },
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "matterTitle", header: "Matter", renderCell: v => String(v || "—") },
        { field: "amount", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
      ]}
    />
  )
}
