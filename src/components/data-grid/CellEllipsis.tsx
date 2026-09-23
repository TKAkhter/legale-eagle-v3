import { Tooltip, Typography } from "@mui/material"
import type { ReactNode } from "react"

/**
 * Shows up to 2 lines of text, then ellipsis.
 * Full text appears in a tooltip on hover.
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
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        wordBreak: "break-word",
        lineHeight: 1.35,
        maxWidth: "100%",
      }}
    >
      {children}
    </Typography>
  )

  if (!text || text === "—" || text.trim() === "") return content

  return (
    <Tooltip title={text} placement="top" enterDelay={400} arrow>
      <span style={{ display: "block", maxWidth: "100%" }}>{content}</span>
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
