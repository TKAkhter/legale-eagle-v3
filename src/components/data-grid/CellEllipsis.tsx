import { Tooltip, Typography } from "@mui/material"
import type { ReactNode } from "react"

/**
 * Single-line ellipsis; full text in tooltip on hover.
 */
export function CellEllipsis({ children, title }: { children: ReactNode; title?: string }) {
  const text = title
    ?? (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined)

  const content = (
    <Typography
      component="span"
      variant="body2"
      sx={{
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        lineHeight: 1.4,
      }}
    >
      {children}
    </Typography>
  )

  if (!text || text === "—" || text.trim() === "") return content

  return (
    <Tooltip title={text} placement="top" enterDelay={400} arrow>
      <span style={{ display: "block", maxWidth: "100%", minWidth: 0 }}>{content}</span>
    </Tooltip>
  )
}

/** Extract plain text from a React node for tooltip (best-effort). */
export function nodeToTooltipText(node: ReactNode): string | undefined {
  if (node == null || node === false) return undefined
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) {
    return node.map(nodeToTooltipText).filter(Boolean).join(" ") || undefined
  }
  return undefined
}
