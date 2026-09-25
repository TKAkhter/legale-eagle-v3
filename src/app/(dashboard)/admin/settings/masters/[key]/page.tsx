/**
 * Generic settings master page — LookupManager for a registry key.
 */
import { Link as RouterLink, useParams, Navigate } from "react-router-dom"
import { Button, Box } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { LookupManager } from "../../_components/LookupManager"
import { getMasterByKey } from "../../_components/settingsRegistry"

export default function SettingsMasterPage() {
  const { key = "" } = useParams<{ key: string }>()
  const master = getMasterByKey(key)

  if (!master) return <Navigate to="/admin/settings" replace />
  if (master.href) return <Navigate to={master.href} replace />

  return (
    <PageShell
      title={master.title}
      description={master.description}
      breadcrumbs={[
        { label: "Settings", path: "/admin/settings" },
        { label: master.title },
      ]}
      action={
        <Button
          component={RouterLink}
          to="/admin/settings"
          size="small"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          All settings
        </Button>
      }
    >
      <Box sx={{ width: "100%", maxWidth: 720 }}>
        <LookupManager
          title={master.title}
          getUrl={master.getUrl}
          addUrl={master.addUrl}
          deleteUrl={master.deleteUrl}
          nameField={master.nameField || "name"}
          queryKey={`settings-master-${master.key}`}
          extraFields={master.extraFields}
          statusChange={master.statusChange}
        />
      </Box>
    </PageShell>
  )
}
