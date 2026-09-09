/**
 * exportUtils.ts — client-side export helpers.
 *
 * exportToCSV(rows, columns, filename) — generate CSV in the browser
 * exportToPDF(rows, columns, title, filename) — basic print-to-PDF via browser
 *
 * These are client-side fallbacks.
 * For production, use the server's /api/export endpoint via exportFn on DataGrid.
 */

export interface ExportColumn {
  field:  string
  header: string
}

/** Generate and download a CSV file from an array of row objects */
export function exportToCSV(
  rows:     Record<string, unknown>[],
  columns:  ExportColumn[],
  filename: string = 'export.csv',
): void {
  const headers = columns.map(c => `"${c.header}"`).join(',')
  const body    = rows.map(row =>
    columns.map(c => {
      const val = row[c.field]
      const str = val == null ? '' : String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  ).join('\n')

  const csv  = `${headers}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlobClient(blob, filename)
}

/** Open browser print dialog — user can choose "Save as PDF" */
export function exportToPDF(
  rows:     Record<string, unknown>[],
  columns:  ExportColumn[],
  title:    string = 'Export',
  filename: string = 'export',
): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; font-size: 12px; margin: 20px; }
    h2   { color: #0F2744; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0F2744; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
    tr:nth-child(even) td { background: #F8FAFC; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <table>
    <thead><tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map(row => `<tr>${columns.map(c => `<td>${row[c.field] ?? ''}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <p style="margin-top:16px;color:#94A3B8;font-size:10px">Generated ${new Date().toLocaleString()}</p>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}

function downloadBlobClient(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
