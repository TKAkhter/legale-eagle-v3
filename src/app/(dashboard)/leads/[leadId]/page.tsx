import { Box, Typography, Paper, Chip, Skeleton, Button, Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Tabs } from '@components/ui/Tabs'
import { formatDate, fromNow } from '@lib/utils/formatDate'

function TimelineItem({ item }: { item: Record<string, unknown> }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(item.followUpContent ?? item.content ?? '—')}</Typography>
        <Typography variant="caption" color="text.secondary">{fromNow(String(item.createdAt ?? ''))}</Typography>
      </Box>
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value ?? '—'}</Typography>
    </Box>
  )
}

export default function LeadDetailPage() {
  const { leadId } = useParams()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['leads', 'detail', leadId],
    queryFn: async () => { const r = await axiosClient.get('/api/leads/get/single', { params: { leadId } }); return r.data?.data ?? r.data },
    enabled: !!leadId,
  })

  const { data: followups = [] } = useQuery({
    queryKey: ['leads', 'followups', leadId],
    queryFn: async () => { const r = await axiosClient.get('/api/leads/get/followup', { params: { leadId } }); return r.data?.data ?? r.data ?? [] },
    enabled: !!leadId,
  })

  if (isLoading) return <Skeleton variant="rounded" height={140} />

  const name = lead?.companyName || `${lead?.firstName ?? ''} ${lead?.lastName ?? ''}`.trim()

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <StatusBadge status={lead?.currentStatus ?? 'PENDING'} />
              {lead?.leadType && <Chip size="small" label={lead.leadType} variant="outlined" />}
              {lead?.practiceArea?.name && <Chip size="small" label={lead.practiceArea.name} variant="outlined" />}
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <Typography variant="body2">{formatDate(lead?.createdAt)}</Typography>
          </Box>
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: 'Follow-up Timeline',
          content: (
            <Box>
              {(followups as Record<string, unknown>[]).length === 0
                ? <Typography color="text.secondary">No follow-ups recorded yet.</Typography>
                : (followups as Record<string, unknown>[]).map((f, i) => <TimelineItem key={i} item={f} />)
              }
            </Box>
          ),
        },
        {
          label: 'Contact Info',
          content: (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2 }}>
                <InfoRow label="Email" value={lead?.emails?.[0]?.emailId ?? lead?.email} />
                <InfoRow label="Phone" value={lead?.phones?.[0]?.phoneNo ?? lead?.phone} />
                <InfoRow label="Company" value={lead?.companyName} />
                <InfoRow label="Source" value={lead?.leadSource?.name} />
                <InfoRow label="Attorney" value={lead?.lawyer ? `${lead.lawyer.firstName} ${lead.lawyer.lastName}` : null} />
                <InfoRow label="Next Follow-up" value={formatDate(lead?.nextFollowUpDate)} />
              </Box>
            </Paper>
          ),
        },
        {
          label: 'Status History',
          content: (
            <Box>
              {([] as Record<string, unknown>[]).length === 0
                ? <Typography color="text.secondary">Status history is tracked in Follow-ups above.</Typography>
                : null
              }
            </Box>
          ),
        },
      ]} />
    </Box>
  )
}
