import type { ColumnDef } from '@components/data-grid/types'
interface Props<T> { rows:T[]; columns:ColumnDef<T>[]; loading?:boolean }
export function CalendarEntryTable<T extends Record<string,unknown>>({ rows, columns, loading }: Props<T>) {
  if (loading) return <div style={{ padding:16, color:'#6b7280' }}>Loading...</div>
  if (!rows.length) return <div style={{ padding:16, color:'#6b7280', textAlign:'center' }}>No entries for this date</div>
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
      <thead><tr>{columns.map(c => <th key={String(c.field)} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #e2e8f0', fontWeight:600 }}>{c.header}</th>)}</tr></thead>
      <tbody>{rows.map((row,i) => (
        <tr key={i}>{columns.map(c => <td key={String(c.field)} style={{ padding:'6px 8px', borderBottom:'1px solid #f1f5f9' }}>{c.renderCell?c.renderCell(row[c.field as keyof T],row):String(row[c.field as keyof T]??'—')}</td>)}</tr>
      ))}</tbody>
    </table>
  )
}
