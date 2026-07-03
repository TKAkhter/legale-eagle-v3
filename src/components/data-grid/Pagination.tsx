import { Box, TablePagination } from '@mui/material'
interface Props { page: number; pageSize: number; total: number; onPageChange:(p:number)=>void; onPageSizeChange:(s:number)=>void }
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  return (
    <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
      <TablePagination component="div" count={total} page={page} rowsPerPage={pageSize}
        onPageChange={(_, p) => onPageChange(p)} onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
        rowsPerPageOptions={[10, 25, 50, 100]} />
    </Box>
  )
}
