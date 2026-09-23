import { Link as RouterLink } from "react-router-dom"
import { Card, CardActionArea, CardContent, Typography } from "@mui/material"

export function SummaryCard({
  count, label, to, color = "primary.main",
}: {
  count: number | string | null | undefined
  label: string
  to?: string
  color?: string
}) {
  const body = (
    <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ textAlign: "center", py: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color, lineHeight: 1.1 }}>
          {count ?? "—"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{label}</Typography>
      </CardContent>
    </Card>
  )
  if (!to) return body
  return (
    <CardActionArea component={RouterLink} to={to} sx={{ borderRadius: 2, height: "100%" }}>
      {body}
    </CardActionArea>
  )
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <BoxGrid>
      {children}
    </BoxGrid>
  )
}

function BoxGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 16,
      marginBottom: 24,
    }}>
      {children}
    </div>
  )
}
