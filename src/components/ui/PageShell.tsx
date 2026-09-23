import { type ReactNode } from "react"
import { Box, Typography } from "@mui/material"
import { Breadcrumbs } from "./Breadcrumbs"
import { ErrorBoundary } from "./ErrorBoundary"
import { SECTION_GAP } from "@/config/spacing"

interface Props {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  breadcrumbs?: { label: string; path?: string }[]
}

export function PageShell({ title, description, action, children, breadcrumbs }: Props) {
  return (
    <ErrorBoundary>
      <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
        <Breadcrumbs items={breadcrumbs} />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "flex-start" },
            gap: 1.5,
            mb: SECTION_GAP,
            width: "100%",
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {description}
              </Typography>
            )}
          </Box>
          {action && (
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                justifyContent: { xs: "flex-start", sm: "flex-end" },
                maxWidth: "100%",
              }}
            >
              {action}
            </Box>
          )}
        </Box>
        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: SECTION_GAP,
          }}
        >
          {children}
        </Box>
      </Box>
    </ErrorBoundary>
  )
}
