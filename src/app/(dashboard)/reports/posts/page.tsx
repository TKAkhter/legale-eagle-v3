/**
 * Posts Report — LMS `/posts` / converted People leads list.
 */
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"
import type { ColumnDef } from "@/components/data-grid/types"

export default function PostsReportPage() {
  const { t } = useTranslation()

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      field: "typeLead",
      header: "Lead Type",
      renderCell: v => String(v || "—"),
    },
    {
      field: "leadSource",
      header: "Source",
      renderCell: v => {
        const raw = String(v || "")
        if (!raw) return "—"
        return t(raw, { defaultValue: raw })
      },
    },
    {
      field: "name",
      header: "Name",
      renderCell: (_v, row) => {
        const first = String(row.firstName ?? "")
        const middle = String(row.middleName ?? "")
        const last = String(row.lastName ?? "")
        const full = [first, middle, last].filter(Boolean).join(" ").trim()
        return full || String(row.name ?? "—")
      },
    },
  ], [t])

  return (
    <SimpleReportPage
      title="Posts Report"
      description="Converted people leads"
      queryKey={["reports", "posts"]}
      queryFn={p => reportsApi.getPostsReport(p)}
      filters={{}}
      columns={columns}
      detailPath={row => `/leads/${String(row.id ?? row.leadId ?? "")}`}
    />
  )
}
