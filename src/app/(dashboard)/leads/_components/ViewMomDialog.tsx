/**
 * View / download meeting MOM — LMS Meetings.js VeiwMOM
 * GET /api/meeting/get/mom?meetingId=
 */
import {
  Button, Dialog, DialogContent, DialogTitle, Link, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from "@mui/material"
import CloudDownloadIcon from "@mui/icons-material/CloudDownload"
import { useQuery } from "@tanstack/react-query"
import { leadsApi } from "@/api/leads"
import { formatDateTime } from "@lib/utils/formatDate"

interface Props {
  open: boolean
  onClose: () => void
  meetingId: string
}

function fileNameFromUrl(url: string): string {
  try {
    const path = url.split("?")[0] ?? url
    return path.split("/").pop() || url
  } catch {
    return url
  }
}

export function ViewMomDialog({ open, onClose, meetingId }: Props) {
  const { data: moms = [], isLoading } = useQuery({
    queryKey: ["leads", "meeting-mom", meetingId],
    queryFn: () => leadsApi.getMeetingMom(meetingId),
    enabled: open && !!meetingId,
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Download MOM</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        )}
        {!isLoading && !moms.length && (
          <Typography variant="body2" color="text.secondary">No MOM uploaded yet.</Typography>
        )}
        {!!moms.length && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Documents</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {moms.map((m, i) => {
                const docs = Array.isArray(m.documents) ? m.documents.map(String) : []
                return (
                  <TableRow key={String(m.id ?? i)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{String(m.textContent ?? m.content ?? m.title ?? "—")}</TableCell>
                    <TableCell>
                      {m.createdAt ? formatDateTime(String(m.createdAt)) : "—"}
                    </TableCell>
                    <TableCell>
                      {docs.length === 0 && "—"}
                      {docs.map((d, di) => (
                        <Typography key={di} variant="body2" component="div" sx={{ mb: 0.5 }}>
                          <Link href={d} target="_blank" rel="noopener noreferrer" download>
                            {fileNameFromUrl(d)}
                            <CloudDownloadIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle" }} />
                          </Link>
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <Button onClick={onClose} sx={{ mt: 2 }}>Close</Button>
      </DialogContent>
    </Dialog>
  )
}
