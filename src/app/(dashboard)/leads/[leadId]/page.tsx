import { env } from '@/config/env'
import { useState } from 'react'
import { Box, Typography, Paper, Chip, Skeleton, Button, Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Tabs } from '@components/ui/Tabs'
import { formatDate, fromNow } from '@lib/utils/formatDate'
import { FollowupFormDrawer } from '../_components/FollowupFormDrawer'
import { LeadConvertDialog } from '../_components/LeadConvertDialog'
import AddIcon from '@mui/icons-material/Add'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'

function TimelineItem({ item }: { item: Record<string, unknown> }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main', mt: 0.7, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{String(item.followUpContent ?? item.content ?? '—')}</Typography>
        <Typography variant="caption" color="text.secondary">{fromNow(String(item.createdAt ?? item.followUpTime ?? ''))}</Typography>
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
  const qc = useQueryClient()
  const [followupOpen, setFollowupOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  const { data: lead, isLoading } = useQuery({
    queryKey: ['leads', 'detail', leadId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) { return { content:[], totalElements:0, totalPages:0, number:0, size:25, first:true, last:true, empty:true } }
      const r = await axiosClient.get('/api/leads/get/single', { params: { leadId } })
      return r.data?.data ?? r.data
    },
    enabled: !!leadId,
  })

  const { data: followups = [] } = useQuery({
    queryKey: ['leads', 'followups', leadId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) { return { content:[], totalElements:0, totalPages:0, number:0, size:25, first:true, last:true, empty:true } }
      const r = await axiosClient.get('/api/leads/get/followup', { params: { leadId } })
      return r.data?.data ?? r.data ?? []
    },
    enabled: !!leadId,
  })

  if (isLoading) return <Skeleton variant="rounded" height={140} />

  const name = lead?.companyName || `${lead?.firstName ?? ''} ${lead?.lastName ?? ''}`.trim()

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <StatusBadge status={lead?.currentStatus ?? 'PENDING'} />
              {lead?.leadType && <Chip size="small" label={lead.leadType} variant="outlined" />}
              {(lead?.practiceArea as Record<string,string>)?.name && <Chip size="small" label={(lead.practiceArea as Record<string,string>).name} variant="outlined" />}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" color="success" startIcon={<SwapHorizIcon />} onClick={() => setConvertOpen(true)}>
              Convert
            </Button>
            <Button size="small" variant="outlined" color="warning"
              onClick={async () => { await axiosClient.post('/api/leads/get/lead/writeoff', { leadId }); qc.invalidateQueries({ queryKey: ['leads'] }) }}>
              Write Off
            </Button>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color:"text.secondary", display:"block" }}>Created</Typography>
              <Typography variant="body2">{formatDate(lead?.createdAt)}</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: 'Follow-up Timeline',
          content: (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setFollowupOpen(true)}>
                  Add Follow-up
                </Button>
              </Box>
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
                <InfoRow label="Email"       value={(lead?.emails as {emailId:string}[])?.[0]?.emailId ?? lead?.email} />
                <InfoRow label="Phone"       value={(lead?.phones as {phoneNo:string}[])?.[0]?.phoneNo ?? lead?.phone} />
                <InfoRow label="Company"     value={lead?.companyName} />
                <InfoRow label="Source"      value={(lead?.leadSource as {name:string})?.name} />
                <InfoRow label="Attorney"    value={lead?.lawyer ? `${(lead.lawyer as Record<string,string>).firstName} ${(lead.lawyer as Record<string,string>).lastName}` : null} />
                <InfoRow label="Next Follow-up" value={formatDate(lead?.nextFollowUpDate)} />
              </Box>
            </Paper>
          ),
        },
      ]} />

      <FollowupFormDrawer
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        leadId={leadId ?? ''}
        onSuccess={() => { setFollowupOpen(false); qc.invalidateQueries({ queryKey: ['leads','followups',leadId] }) }}
      />
      <LeadConvertDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        leadId={leadId ?? ''}
        leadName={name}
      />
    </Box>
  )
}
