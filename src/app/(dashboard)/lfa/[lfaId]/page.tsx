import { Box, Typography, Paper, Chip, Skeleton } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { Tabs } from '@components/ui/Tabs'
import { StatusBadge } from '@components/ui/StatusBadge'
import { formatCurrency } from '@lib/utils/formatCurrency'
import { formatDate } from '@lib/utils/formatDate'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ mb:1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight:500 }}>{value ?? '—'}</Typography>
    </Box>
  )
}

export default function LfaDetailPage() {
  const { lfaId } = useParams()
  const { data: lfa, isLoading } = useQuery({
    queryKey: ['lfa','detail',lfaId],
    queryFn: async () => { const r = await axiosClient.get('/api/lfa/get/full',{params:{lfaId}}); return r.data?.data??r.data },
    enabled: !!lfaId,
  })
  if (isLoading) return <Skeleton variant="rounded" height={140} />
  return (
    <Box>
      <Paper variant="outlined" sx={{ p:3, mb:3, borderRadius:2 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight:600 }}>{lfa?.lfaTitle ?? lfa?.agreementNo ?? 'LFA'}</Typography>
            <Box sx={{ display:'flex', gap:1, mt:1 }}>
              <StatusBadge status={lfa?.current ? 'Approved' : 'Draft'} />
              <Chip size="small" label={lfa?.billingType??'—'} variant="outlined" />
            </Box>
          </Box>
        </Box>
      </Paper>
      <Tabs tabs={[
        { label: 'Overview', content: (
          <Paper variant="outlined" sx={{ p:3, borderRadius:2 }}>
            <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:2 }}>
              <InfoRow label="Agreement No" value={lfa?.agreementNo} />
              <InfoRow label="Agreement Date" value={formatDate(lfa?.agreementDate)} />
              <InfoRow label="Billing Type" value={lfa?.billingType} />
              <InfoRow label="Fixed Amount" value={lfa?.fixedBillingAmount ? formatCurrency(lfa.fixedBillingAmount) : '—'} />
              <InfoRow label="Contingent %" value={lfa?.contingent ? `${lfa.contingent}%` : '—'} />
              <InfoRow label="Cap" value={lfa?.cap ? formatCurrency(lfa?.capAmount) : 'No cap'} />
              <InfoRow label="Retainer" value={lfa?.retainer ? formatCurrency(lfa?.retainerAmount) : 'No'} />
              <InfoRow label="Referral" value={lfa?.referral ? `${lfa.referralPercentage}%` : 'No'} />
            </Box>
          </Paper>
        )},
        { label: 'Rate Breakdown', content: (
          <Paper variant="outlined" sx={{ p:3, borderRadius:2 }}>
            {lfa?.designationRate?.length
              ? lfa.designationRate.map((r: Record<string,unknown>, i: number) => (
                <Box key={i} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom:'1px solid', borderColor:'divider' }}>
                  <Typography variant="body2">{String(r.designationName??r.designationId??'—')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight:500 }}>{formatCurrency(Number(r.rate??0))}</Typography>
                </Box>
              ))
              : <Typography color="text.secondary">No designation-level rates configured.</Typography>
            }
          </Paper>
        )},
        { label: 'Matters', content: <Typography color="text.secondary" sx={{p:2}}>Applicable matters for this LFA.</Typography> },
      ]} />
    </Box>
  )
}
