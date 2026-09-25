import { Link } from "react-router-dom"
import { reportsApi } from "@/api/reports"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { computeWipBilledHours } from "@lib/utils/wipHours"
import type { ColumnDef } from "@/components/data-grid/types"
import type { ReportFilterConfig } from "@/components/filters/ReportFilterPanel"
import type { GridParams, PageResponse } from "@/types/common.types"

export type WipTabId = "overview" | "department" | "attorney" | "matter"

export const WIP_TAB_IDS: WipTabId[] = ["overview", "department", "attorney", "matter"]

export function parseWipTab(raw: string | null): WipTabId {
  if (raw === "department" || raw === "attorney" || raw === "matter" || raw === "overview") return raw
  return "department"
}

function deptName(v: unknown, row: Record<string, unknown>): string {
  if (typeof v === "string" && v) return v
  const nested = row.department
  if (nested && typeof nested === "object" && "name" in nested) {
    return String((nested as { name?: unknown }).name ?? "—")
  }
  return String(row.departmentName ?? row.departmentdata ?? "—")
}

function clientName(_v: unknown, row: Record<string, unknown>): string {
  const mini = row.matterMini as { clientMini?: { companyName?: string; firstName?: string; name?: string } } | undefined
  const c = mini?.clientMini ?? (row.clientMini as { companyName?: string; firstName?: string; name?: string } | undefined)
  if (c) return String(c.companyName ?? c.name ?? c.firstName ?? "—")
  return String(row.clientName ?? "—")
}

function matterTitle(_v: unknown, row: Record<string, unknown>): string {
  const mini = row.matterMini as { title?: string; matterId?: string } | undefined
  return String(mini?.title ?? row.matterTitle ?? row.Matter ?? "—")
}

function matterIdOf(_v: unknown, row: Record<string, unknown>): string {
  const mini = row.matterMini as { matterId?: string; id?: string } | undefined
  return String(mini?.matterId ?? mini?.id ?? row.matterId ?? "")
}

function matterDept(_v: unknown, row: Record<string, unknown>): string {
  const mini = row.matterMini as { departmentName?: string } | undefined
  return String(mini?.departmentName ?? row.matterdepartment ?? "—")
}

const sharedFilters: ReportFilterConfig = {
  showUser: true,
  showDepartment: true,
  showMatter: true,
  showDateRange: true,
}

export type WipPanelConfig = {
  id: Exclude<WipTabId, "overview">
  label: string
  title: string
  description: string
  queryKey: string[]
  queryFn: (p: GridParams) => Promise<PageResponse<Record<string, unknown>>>
  emailExcelFn: (f: Record<string, unknown>) => Promise<string>
  filters: ReportFilterConfig
  columns: ColumnDef<Record<string, unknown>>[]
}

export const wipPanels: WipPanelConfig[] = [
  {
    id: "department",
    label: "Department",
    title: "WIP by Department",
    description: "Work in progress grouped by department",
    queryKey: ["reports", "wip-department"],
    queryFn: p => reportsApi.getWipDepartment(p),
    emailExcelFn: f => reportsApi.requestWipDepartmentExcel(f),
    filters: sharedFilters,
    columns: [
      { field: "department", header: "Department", renderCell: (v, row) => deptName(v, row) },
      { field: "totalHours", header: "Total Hours", align: "right", renderCell: v => String(v ?? "—") },
      {
        field: "totalBilledHours",
        header: "Total Billed Hours",
        align: "right",
        renderCell: (v, row) =>
          String(v ?? computeWipBilledHours(row.totalHours, row.totalUnbilledHours)),
      },
      { field: "totalUnbilledHours", header: "Total Unbilled Hours", align: "right", renderCell: v => String(v ?? "—") },
      { field: "wipAmount", header: "WIP Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
    ],
  },
  {
    id: "attorney",
    label: "Attorney",
    title: "WIP by Attorney",
    description: "Work in progress grouped by fee earner",
    queryKey: ["reports", "wip-attorney"],
    queryFn: p => reportsApi.getWipAttorney(p),
    emailExcelFn: f => reportsApi.requestWipAttorneyExcel(f),
    filters: sharedFilters,
    columns: [
      { field: "responsiblePerson", header: "Attorney", renderCell: v => String(v || "—") },
      { field: "department", header: "Department", renderCell: (v, row) => deptName(v, row) },
      { field: "totalHours", header: "Total Hours", align: "right", renderCell: v => String(v ?? "—") },
      {
        field: "totalBilledHours",
        header: "Total Billed Hours",
        align: "right",
        renderCell: (v, row) =>
          String(v ?? computeWipBilledHours(row.totalHours, row.totalUnbilledHours)),
      },
      { field: "totalUnbilledHours", header: "Total Unbilled Hours", align: "right", renderCell: v => String(v ?? "—") },
      { field: "wipAmount", header: "WIP Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
    ],
  },
  {
    id: "matter",
    label: "Matter",
    title: "WIP by Matter",
    description: "Work in progress grouped by matter",
    queryKey: ["reports", "wip-matter"],
    queryFn: p => reportsApi.getWipMatter(p),
    emailExcelFn: f => reportsApi.requestWipMatterExcel(f),
    filters: sharedFilters,
    columns: [
      { field: "clientName", header: "Client", renderCell: (v, row) => clientName(v, row) },
      { field: "responsiblePerson", header: "Attorney", renderCell: v => String(v || "—") },
      { field: "department", header: "Department", renderCell: (v, row) => deptName(v, row) },
      {
        field: "matterTitle",
        header: "Matter Number",
        renderCell: (v, row) => {
          const title = matterTitle(v, row)
          const id = matterIdOf(v, row)
          if (id) {
            return <Link to={`/matters/${id}`} style={{ color: "inherit" }}>{title}</Link>
          }
          return title
        },
      },
      { field: "matterdepartment", header: "Matter Department", renderCell: (v, row) => matterDept(v, row) },
      { field: "totalHours", header: "Total Hours", align: "right", renderCell: v => String(v ?? "—") },
      {
        field: "totalBilledHours",
        header: "Total Billed Hours",
        align: "right",
        renderCell: (v, row) =>
          String(v ?? computeWipBilledHours(row.totalHours, row.totalUnbilledHours)),
      },
      { field: "totalUnbilledHours", header: "Total Unbilled Hours", align: "right", renderCell: v => String(v ?? "—") },
      { field: "wipAmount", header: "WIP Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
    ],
  },
]
