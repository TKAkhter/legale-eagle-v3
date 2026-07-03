import { TableRow, TableCell, Skeleton } from '@mui/material'
export function SkeletonRows({ colCount, rowCount = 10 }: { colCount: number; rowCount?: number }) {
  return <>{Array.from({ length: rowCount }).map((_, i) => (
    <TableRow key={i}>{Array.from({ length: colCount }).map((_, j) => (
      <TableCell key={j}><Skeleton variant="text" /></TableCell>
    ))}</TableRow>
  ))}</>
}
