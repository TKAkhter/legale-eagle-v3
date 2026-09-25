import { useMemo } from "react"
import { Link as RouterLink } from "react-router-dom"
import { Box, Paper, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { useAuthStore } from "@lib/store/authStore"
import { navigationConfig } from "@/config/navigation"

/** LMS-style reports hub — cards for every report the user can see. */
export default function ReportsHubPage() {
  const { t } = useTranslation()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const reports = useMemo(() => {
    const section = navigationConfig.find(n => n.id === "reports")
    const children = section?.children ?? []
    const cards = children.filter(c => c.id !== "reports-hub" && (!c.permission || hasPermission(c.permission)))
    // LFA Report lives under LFA nav in NEW but was on OLD Reports hub
    const lfaCard = {
      id: "lfa-report",
      title: "LFA Report",
      path: "/lfa/reports",
      icon: "DescriptionOutlined",
      permission: undefined as string | undefined,
    }
    if (!cards.some(c => c.path === "/lfa/reports")) {
      return [...cards, lfaCard]
    }
    return cards
  }, [hasPermission])

  return (
    <PageShell title={t("nav.reports")} description={t("pages.reportsDesc")}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        {reports.map(r => (
          <Paper
            key={r.id}
            component={RouterLink}
            to={r.path ?? "/reports/wip"}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              textDecoration: "none",
              color: "inherit",
              transition: "border-color .15s, background-color .15s",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t(r.title)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{r.path}</Typography>
          </Paper>
        ))}
      </Box>
    </PageShell>
  )
}
