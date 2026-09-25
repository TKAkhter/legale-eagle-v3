import { useMemo, useState } from "react"
import { Button } from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { makeReportFilterPanel, type ReportFilterConfig } from "@/components/filters/ReportFilterPanel"
import { toast } from "@/lib/toast"
import type { ColumnDef } from "@/components/data-grid/types"
import type { GridParams, PageResponse } from "@/types/common.types"

interface Props {
  title: string
  description: string
  queryKey: string[]
  queryFn: (p: GridParams) => Promise<PageResponse<Record<string, unknown>>>
  columns: ColumnDef<Record<string, unknown>>[]
  filters?: ReportFilterConfig
  /** When set, shows Email Excel action (LMS email-export pattern). */
  emailExcelFn?: (filters: Record<string, unknown>) => Promise<string>
  exportFn?: (p: GridParams) => Promise<Blob>
  exportFilename?: string
  detailPath?: (row: Record<string, unknown>) => string
}

export function SimpleReportPage({
  title,
  description,
  queryKey,
  queryFn,
  columns,
  filters = { showClient: true, showDateRange: true },
  emailExcelFn,
  exportFn,
  exportFilename = "report.xlsx",
  detailPath,
}: Props) {
  const BaseFilterPanel = makeReportFilterPanel(filters)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({})
  const [emailing, setEmailing] = useState(false)

  const FilterPanel = useMemo(() => {
    return function Panel(props: {
      onSearch: (f: Record<string, unknown>) => void
      onReset: () => void
      filters: Record<string, unknown>
    }) {
      return (
        <BaseFilterPanel
          {...props}
          onSearch={f => {
            setAppliedFilters(f)
            props.onSearch(f)
          }}
          onReset={() => {
            setAppliedFilters({})
            props.onReset()
          }}
        />
      )
    }
  }, [BaseFilterPanel])

  async function handleEmailExcel() {
    if (!emailExcelFn) return
    setEmailing(true)
    try {
      toast.success(await emailExcelFn(appliedFilters))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title={title}
      description={description}
      action={emailExcelFn ? (
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void handleEmailExcel() }}
        >
          Email Excel
        </Button>
      ) : undefined}
    >
      <DataGrid
        columns={columns}
        queryKey={queryKey}
        queryFn={queryFn}
        FilterPanel={FilterPanel}
        hasFilters
        hasExport={Boolean(exportFn)}
        exportFn={exportFn}
        exportFilename={exportFilename}
        detailPath={detailPath}
        syncWithUrl
        zebraStriping
      />
    </PageShell>
  )
}
