import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import { useQuery } from "@tanstack/react-query"
import { clientsApi } from "@/api/clients"
import { DetailInfoRow } from "@/components/detail/DetailInfoRow"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { formatCurrency } from "@lib/utils/formatCurrency"
import type { GridParams, PageResponse } from "@/types/common.types"

interface Props {
  clientId: string
}

function pageOfCustomers(
  rows: Record<string, unknown>[],
  p: GridParams,
): PageResponse<Record<string, unknown>> {
  const start = p.page * p.pageSize
  const slice = rows.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= rows.length,
    empty: slice.length === 0,
  }
}

/** Client Zoho Outstanding (OLD ClientZohoIntegration / POST /zoho/outstanding). */
export function ClientZohoOutstandingTab({ clientId }: Props) {
  const query = useQuery({
    queryKey: ["clients", "zoho-outstanding", clientId],
    queryFn: () => clientsApi.getZohoOutstanding(clientId),
    enabled: !!clientId,
  })

  if (query.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (query.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      >
        {(query.error as { message?: string })?.message ?? "Failed to load Zoho outstanding."}
      </Alert>
    )
  }

  const result = query.data
  if (result?.errorMessage) {
    return (
      <Alert
        severity="info"
        action={
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => query.refetch()}>
            Refresh
          </Button>
        }
      >
        {result.errorMessage}
      </Alert>
    )
  }

  const customers = result?.customers ?? []
  const primary = customers[0]

  if (!primary) {
    return (
      <Box sx={{ py: 3, textAlign: "center" }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No Zoho outstanding data for this client.
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => query.refetch()}>
          Refresh
        </Button>
      </Box>
    )
  }

  const gridRows = customers.map(c => ({
    id: c.key,
    contactName: c.contactName,
    companyName: c.companyName,
    status: c.status,
    outstandingReceivable: c.outstandingReceivable,
    unusedCredits: c.unusedCredits,
    netBalance: c.netBalance,
    customerId: c.customerId,
  }))

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Refresh
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Zoho Balance
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
          <DetailInfoRow label="Contact" value={primary.contactName} />
          <DetailInfoRow label="Company" value={primary.companyName} />
          <DetailInfoRow label="Status" value={primary.status} />
          <DetailInfoRow label="Zoho Customer ID" value={primary.customerId} />
          <DetailInfoRow label="Outstanding Receivable" value={formatCurrency(primary.outstandingReceivable)} />
          <DetailInfoRow label="Unused Credits" value={formatCurrency(primary.unusedCredits)} />
          <DetailInfoRow label="Net Balance" value={formatCurrency(primary.netBalance)} />
        </Box>
      </Paper>

      {customers.length > 1 && (
        <DataGrid
          columns={[
            { field: "contactName", header: "Contact" },
            { field: "companyName", header: "Company" },
            { field: "status", header: "Status" },
            {
              field: "outstandingReceivable",
              header: "Outstanding",
              align: "right",
              renderCell: v => formatCurrency(Number(v ?? 0)),
            },
            {
              field: "unusedCredits",
              header: "Unused Credits",
              align: "right",
              renderCell: v => formatCurrency(Number(v ?? 0)),
            },
            {
              field: "netBalance",
              header: "Net Balance",
              align: "right",
              renderCell: v => formatCurrency(Number(v ?? 0)),
            },
          ]}
          queryKey={["clients", "zoho-outstanding-grid", clientId]}
          queryFn={(p: GridParams) => Promise.resolve(pageOfCustomers(gridRows, p))}
          zebraStriping
          defaultPageSize={10}
        />
      )}
    </Box>
  )
}
