/**
 * Referral Partner Commission — LMS `/referral-partners`.
 * Read-only: pick LFA agreement + limit → commission rows + totals.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Autocomplete,
  Box,
  Button,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import type { ColumnDef } from "@/components/data-grid/types"
import { miscModulesApi, type ReferralCommissionRow } from "@/api/miscModules"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import type { GridParams, PageResponse } from "@/types/common.types"

const LIMIT_OPTIONS = [0, 1, 2, 3, 4, 5]

export default function ReferralPartnersPage() {
  const navigate = useNavigate()
  const [lfaId, setLfaId] = useState("")
  const [limit, setLimit] = useState(0)
  const [fetchKey, setFetchKey] = useState(0)

  const agreementsQ = useQuery({
    queryKey: ["referral-agreements"],
    queryFn: () => miscModulesApi.getMyReferralAgreements(),
  })

  const agreements = agreementsQ.data ?? []
  const selected = agreements.find(a => a.id === lfaId) ?? null

  const columns: ColumnDef<ReferralCommissionRow>[] = useMemo(() => [
    {
      field: "clientName",
      header: "Client Name",
      renderCell: (v, row) => {
        const id = row.clientId
        if (!id) return String(v || "—")
        return (
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={e => { e.stopPropagation(); navigate(`/clients/${id}`) }}
          >
            {String(v || "—")}
          </Link>
        )
      },
    },
    { field: "referralUserName", header: "Referred By" },
    { field: "invoiceNo", header: "Invoice No", width: 120 },
    { field: "lfaNo", header: "LFA", width: 120 },
    {
      field: "invoiceAmount",
      header: "Invoice Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "commissionPercentage",
      header: "Commission %",
      align: "right",
      width: 120,
      renderCell: v => `${Number(v ?? 0)}%`,
    },
    {
      field: "commissionAmount",
      header: "Commission Amount",
      align: "right",
      renderCell: v => formatCurrency(Number(v ?? 0)),
    },
    {
      field: "createdAt",
      header: "Created At",
      width: 120,
      renderCell: v => formatDate(String(v ?? "")),
    },
  ], [navigate])

  async function queryFn(_p: GridParams): Promise<PageResponse<ReferralCommissionRow>> {
    if (!lfaId || fetchKey === 0) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 25,
        first: true,
        last: true,
        empty: true,
      }
    }
    const rows = await miscModulesApi.getReferralCommissions(lfaId, limit)
    return {
      content: rows,
      totalElements: rows.length,
      totalPages: 1,
      number: 0,
      size: rows.length || 25,
      first: true,
      last: true,
      empty: rows.length === 0,
    }
  }

  const totalsQ = useQuery({
    queryKey: ["referral-commissions-totals", lfaId, limit, fetchKey],
    queryFn: () => miscModulesApi.getReferralCommissions(lfaId, limit),
    enabled: Boolean(lfaId) && fetchKey > 0,
  })

  const totals = useMemo(() => {
    const rows = totalsQ.data ?? []
    return {
      invoice: rows.reduce((s, r) => s + Number(r.invoiceAmount ?? 0), 0),
      commission: rows.reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0),
    }
  }, [totalsQ.data])

  return (
    <PageShell
      title="Referral Partner Commission"
      description="Commission earned on invoices for your referral LFA agreements"
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Autocomplete
            sx={{ minWidth: 280, flex: 1 }}
            options={agreements}
            loading={agreementsQ.isLoading}
            value={selected}
            getOptionLabel={o => `${o.agreementNo}${o.billingType ? ` (${o.billingType})` : ""}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, v) => setLfaId(v?.id ?? "")}
            renderInput={params => (
              <TextField {...params} label="Agreement No." size="small" />
            )}
          />
          <Autocomplete
            sx={{ width: 140 }}
            options={LIMIT_OPTIONS}
            value={limit}
            getOptionLabel={o => (o === 0 ? "All" : String(o))}
            onChange={(_, v) => setLimit(v ?? 0)}
            renderInput={params => (
              <TextField {...params} label="Number" size="small" />
            )}
          />
          <Button
            variant="contained"
            size="small"
            disabled={!lfaId}
            onClick={() => setFetchKey(k => k + 1)}
          >
            Fetch
          </Button>
        </Box>
      </Paper>

      {fetchKey > 0 && lfaId && (
        <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
          <Typography variant="body2">
            Total Invoice Amount: <strong>{formatCurrency(totals.invoice)}</strong>
          </Typography>
          <Typography variant="body2">
            Total Commission Amount: <strong>{formatCurrency(totals.commission)}</strong>
          </Typography>
        </Box>
      )}

      <DataGrid<ReferralCommissionRow>
        columns={columns}
        queryKey={["referral-commissions", lfaId, limit, fetchKey]}
        queryFn={queryFn}
        zebraStriping
        isPaginated={false}
        syncWithUrl={false}
        defaultSortBy="createdAt"
        emptyState={
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            {lfaId
              ? (fetchKey === 0 ? "Click Fetch to load commissions" : "No commission records")
              : "Select an agreement and click Fetch"}
          </Typography>
        }
      />
    </PageShell>
  )
}
