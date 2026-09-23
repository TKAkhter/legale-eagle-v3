import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { Chip } from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import VisibilityIcon from "@mui/icons-material/Visibility"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { lfaApi } from "@/api/lfa"
import type { GridParams } from "@/types/common.types"
import { LfaRatesDialog } from "../_components/LfaRatesDialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function DefaultLfasPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [ratesId, setRatesId] = useState<string>()
  const [activateId, setActivateId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title={t("nav.lfa-default", "Default Fee Agreements")}
      description={t("lfa.defaultDesc", "Standard fee agreement templates")}
    >
      <DataGrid
        key={gridKey}
        columns={[
          { field: "agreementNo", header: "Agreement No.", sortKey: "agreementNo", minWidth: 140 },
          { field: "billingType", header: "Billing Type", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
          {
            field: "fixedBillingAmount",
            header: "Fixed Amount",
            align: "right",
            renderCell: v => v != null ? formatCurrency(Number(v)) : "—",
          },
          {
            field: "hourlyRate",
            header: "Hourly Rate",
            align: "right",
            renderCell: v => v != null ? `${formatCurrency(Number(v))}/hr` : "—",
          },
          {
            field: "sessionRate",
            header: "Session Rate",
            align: "right",
            renderCell: v => v != null ? formatCurrency(Number(v)) : "—",
          },
          { field: "current", header: "Status", renderCell: v => <StatusBadge status={v ? "Active" : "Inactive"} /> },
        ]}
        queryKey={["lfa", "default"]}
        queryFn={(p: GridParams) => lfaApi.getDefaults(p)}
        isPaginated={false}
        defaultSortBy="agreementNo"
        rowMenuItems={row => {
          const r = row as Record<string, unknown>
          const id = String(r.id ?? "")
          return [
            {
              label: "View Rates",
              icon: <VisibilityIcon fontSize="small" />,
              hidden: () => String(r.billingType) === "Fixed",
              onClick: () => setRatesId(id),
            },
            {
              label: "Activate",
              icon: <PlayArrowIcon fontSize="small" />,
              hidden: () => Boolean(r.current),
              onClick: () => setActivateId(id),
            },
          ]
        }}
      />
      <LfaRatesDialog open={!!ratesId} lfaId={ratesId} onClose={() => setRatesId(undefined)} />
      <ConfirmDialog
        open={!!activateId}
        onClose={() => setActivateId(undefined)}
        onConfirm={async () => {
          toast.success(await lfaApi.activateDefault(String(activateId)))
          setActivateId(undefined)
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["lfa", "default"] })
        }}
        title="Activate Default LFA"
        message="Make this the active default fee agreement?"
        confirmLabel="Activate"
      />
    </PageShell>
  )
}
