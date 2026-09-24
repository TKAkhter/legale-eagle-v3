import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import UpgradeIcon from "@mui/icons-material/Upgrade"
import LockIcon from "@mui/icons-material/Lock"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { ShortMatterFormDrawer } from "./_components/ShortMatterFormDrawer"
import { PromoteShortMatterDrawer } from "./_components/PromoteShortMatterDrawer"
import { ShortMatterCloseDialog } from "./_components/ShortMatterCloseDialog"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

const FilterPanel = makeReportFilterPanel({ showClient: true })

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

function attorneyName(row: Record<string, unknown>): string {
  const a = row.responsibleAttorney as { firstName?: string; lastName?: string } | undefined
  if (a) return `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || "—"
  return text(row.attorneyName ?? row.responsibleAttorneyName)
}

export default function ShortMattersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const clientFromUrl = searchParams.get("clientId") ?? undefined
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [promoteRow, setPromoteRow] = useState<Record<string, unknown> | null>(null)
  const [closeTarget, setCloseTarget] = useState<{ id: string; title: string } | null>(null)

  return (
    <PageShell
      title="Short Matters"
      description="Short-form matters by client"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
          New Short Matter
        </Button>
      }
    >
      <DataGrid
        columns={[
          {
            field: "title",
            header: "Title",
            sortKey: "title",
            renderCell: (v, row) => text(v ?? (row as { matterTitle?: string }).matterTitle),
          },
          {
            field: "matterType",
            header: "Matter Type",
            width: 130,
            renderCell: v => text(v || "Short_Matter"),
          },
          {
            field: "practiceArea",
            header: "Practice Area",
            renderCell: (v, row) => {
              if (typeof v === "object" && v) return text((v as { name?: string }).name)
              return text(v || (row as Record<string, unknown>).practiceAreaName)
            },
          },
          {
            field: "responsibleAttorney",
            header: "Responsible Attorney",
            renderCell: (_v, row) => attorneyName(row as Record<string, unknown>),
          },
          {
            field: "clientName",
            header: "Client",
            renderCell: v => text(v),
          },
          {
            field: "status",
            header: "Status",
            width: 120,
            renderCell: v => <StatusBadge status={String(v ?? "")} />,
          },
          {
            field: "openDate",
            header: "Opened",
            width: 120,
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
        ]}
        queryKey={["matters", "short", clientFromUrl ?? ""]}
        queryFn={(p: GridParams) => miscModulesApi.getShortMatters({
          ...p,
          filters: {
            ...p.filters,
            ...(clientFromUrl ? { clientId: clientFromUrl } : {}),
          },
        })}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        detailPath={row => `/matters/short/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          const status = String(r.status ?? "").toUpperCase()
          const closed = status === "CLOSE" || status === "CLOSED"
          return [
            { label: "Details", onClick: () => navigate(`/matters/short/${id}`) },
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => { setEditId(id); setDrawerOpen(true) },
            },
            ...(!closed ? [{
              label: "Promote to Long Matter",
              icon: <UpgradeIcon fontSize="small" />,
              onClick: () => setPromoteRow(r),
            }] : []),
            ...(!closed ? [{
              label: "Close",
              icon: <LockIcon fontSize="small" />,
              onClick: () => setCloseTarget({ id, title: String(r.title ?? r.matterTitle ?? "") }),
            }] : []),
          ]
        }}
      />
      <ShortMatterFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        shortMatterId={editId}
        clientId={clientFromUrl}
        onSuccess={() => {
          setDrawerOpen(false)
          setEditId(undefined)
          qc.invalidateQueries({ queryKey: ["matters", "short"] })
          toast.success(editId ? "Short matter updated" : "Short matter created")
        }}
      />
      <PromoteShortMatterDrawer
        open={!!promoteRow}
        onClose={() => setPromoteRow(null)}
        shortMatter={promoteRow}
        onSuccess={() => {
          setPromoteRow(null)
          qc.invalidateQueries({ queryKey: ["matters", "short"] })
          toast.success("Short matter promoted to long matter")
        }}
      />
      {closeTarget && (
        <ShortMatterCloseDialog
          open
          matterId={closeTarget.id}
          matterTitle={closeTarget.title}
          onClose={() => setCloseTarget(null)}
          onClosed={() => {
            setCloseTarget(null)
            qc.invalidateQueries({ queryKey: ["matters", "short"] })
          }}
        />
      )}
    </PageShell>
  )
}
