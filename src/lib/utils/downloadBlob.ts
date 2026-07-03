export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
export function getFilenameFromHeaders(headers: Record<string, string>, fallback = 'export.xlsx'): string {
  const cd = headers['content-disposition'] ?? ''
  const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  return match ? match[1].replace(/['"]/g, '') : fallback
}
