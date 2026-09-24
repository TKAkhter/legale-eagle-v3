import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@mui/material"
import MoneyOffIcon from "@mui/icons-material/MoneyOff"
import AddIcon from "@mui/icons-material/Add"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { makeReportFilterPanel } from "@/components/filters/ReportFilterPanel"
import { WriteOffDialog } from "../../leads/_components/WriteOffDialog"
import { miscModulesApi } from "@/api/miscModules"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"

const BaseFilterPanel = makeReportFilterPanel({
  showClient: true,
  showDateRange: true,
  showStage: true,
  showLeadSource: true,
})

function primaryPhone(row: Record<string, unknown>): string {
  const phones = row.phones as { phoneNo?: string; primary?: boolean }[] | undefined
  if (Array.isArray(phones) && phones.length) {
    const p = phones.find(x => x.primary) ?? phones[0]
    return String(p.phoneNo ?? "—")
  }
  return String(row.phone ?? "—")
}

function primaryEmail(row: Record<string, unknown>): string {
  const emails = (row.email ?? row.emails) as { emailId?: string }[] | string | undefined
  if (Array.isArray(emails) && emails.length) return String(emails[0]?.emailId ?? "—")
  if (typeof emails === "string" && emails) return emails
  return "—"
}

function text(v: unknown): string {
  return v == null || v === "" ? "—" : String(v)
}

export default function PendingMattersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [writeOffId, setWriteOffId] = useState<string | null>(null)
  const [emailing, setEmailing] = useState(false)
  const [lastFilters, setLastFilters] = useState<Record<string, unknown>>({})
  const canCreate = useAuthStore(s => s.hasPermission)("/matters")

  const FilterPanel = useMemo(() => {
    return function PendingFilterPanel(props: {
      onSearch: (f: Record<string, unknown>) => void
      onReset: () => void
      filters: Record<string, unknown>
    }) {
      return (
        <BaseFilterPanel
          {...props}
          onSearch={f => {
            setLastFilters(f)
            props.onSearch(f)
          }}
          onReset={() => {
            setLastFilters({})
            props.onReset()
          }}
        />
      )
    }
  }, [])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await miscModulesApi.exportPendingMatters(lastFilters))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  return (
    <PageShell
      title="Pending Matters"
      description="Leads awaiting matter creation"
      action={(
        <Button
          size="small"
          variant="outlined"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
        >
          Email Excel
        </Button>
      )}
    >
      <DataGrid
        columns={[
          {
            field: "clientName",
            header: "Client Name",
            renderCell: (v, row) => text(v || (row as Record<string, unknown>).client),
          },
          {
            field: "name",
            header: "Lead Name",
            renderCell: (v, row) => text(
              v
              || (row as Record<string, unknown>).companyName
              || `${(row as Record<string, string>).firstName ?? ""} ${(row as Record<string, string>).lastName ?? ""}`.trim(),
            ),
          },
          {
            field: "description",
            header: "Scope of Work",
            renderCell: (v, row) => text(
              v
              || (row as Record<string, unknown>).scopeOfWork
              || (row as Record<string, unknown>).natureOfDispute,
            ),
          },
          {
            field: "status",
            header: "Status",
            width: 120,
            renderCell: v => <StatusBadge status={String(v ?? "")} />,
          },
          {
            field: "email",
            header: "Email",
            renderCell: (_v, row) => primaryEmail(row as Record<string, unknown>),
          },
          {
            field: "phones",
            header: "Phone",
            width: 140,
            renderCell: (_v, row) => primaryPhone(row as Record<string, unknown>),
          },
          {
            field: "convertedAt",
            header: "Lead Converted on",
            width: 140,
            renderCell: (v, row) => {
              const d = v || (row as Record<string, unknown>).leadConvertedOn || (row as Record<string, unknown>).convertedDate
              return d ? formatDate(String(d)) : "—"
            },
          },
          {
            field: "leadSource",
            header: "Lead Source",
            renderCell: (v, row) => {
              if (typeof v === "object" && v) return text((v as { name?: string }).name)
              return text(v || (row as Record<string, unknown>).leadSourceName)
            },
          },
          {
            field: "referredBy",
            header: "Referred By",
            renderCell: (v, row) => text(
              v
              || (row as Record<string, unknown>).referralUserName
              || (row as Record<string, unknown>).referredByName,
            ),
          },
        ]}
        queryKey={["matters", "pending"]}
        queryFn={(p: GridParams) => miscModulesApi.getPendingMatters(p)}
        FilterPanel={FilterPanel}
        hasFilters
        zebraStriping
        detailPath={row => `/leads/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            ...(canCreate ? [{
              label: "Create Matter",
              icon: <AddIcon fontSize="small" />,
              onClick: () => navigate(`/matters?new=1&leadId=${id}`),
            }] : []),
            { label: "Open Lead", onClick: () => navigate(`/leads/${id}`) },
            { label: "Write Off", icon: <MoneyOffIcon fontSize="small" />, onClick: () => setWriteOffId(id) },
          ]
        }}
      />
      <WriteOffDialog
        open={!!writeOffId}
        onClose={() => setWriteOffId(null)}
        leadId={writeOffId ?? ""}
        onSuccess={() => {
          setWriteOffId(null)
          qc.invalidateQueries({ queryKey: ["matters", "pending"] })
          toast.success("Lead written off")
        }}
      />
    </PageShell>
  )
}
