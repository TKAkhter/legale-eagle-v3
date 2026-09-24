import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Autocomplete, Box, Button, FormControlLabel, Switch, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { BudgetCardDrawer } from "./_components/BudgetCardDrawer"
import { adminApi } from "@/api/admin"
import { budgetingApi, type BudgetCardRow } from "@/api/budgeting"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams, PageResponse } from "@/types/common.types"

type MinUser = {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  active?: boolean
  loginDisabled?: boolean
}

function displayName(u: MinUser) {
  return u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id
}

function monthName(month: number): string {
  if (!month || month < 1 || month > 12) return "—"
  return new Date(2000, month - 1, 1).toLocaleString("default", { month: "long" })
}

/** LMS `/budgeting/budget-cards` — per-user monthly budgets with add/edit/delete. */
export default function BudgetCardsPage() {
  const qc = useQueryClient()
  const [showInactive, setShowInactive] = useState(false)
  const [selectedUser, setSelectedUser] = useState<MinUser | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add")
  const [editInitial, setEditInitial] = useState<{
    id?: string
    amount: string
    year: string
    month: string
  } | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<BudgetCardRow | null>(null)

  const { data: usersMin = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "min", "budget-cards"],
    queryFn: () => adminApi.getUsersMin(),
  })

  const userOpts = useMemo(() => {
    const list = (Array.isArray(usersMin) ? usersMin : []) as MinUser[]
    return list.filter(u => {
      const active = u.isActive !== false && u.active !== false
      const loginDisabled = Boolean(u.loginDisabled)
      if (showInactive) return true
      return active && !loginDisabled
    })
  }, [usersMin, showInactive])

  async function queryFn(_p: GridParams): Promise<PageResponse<BudgetCardRow>> {
    if (!selectedUser?.id) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 25,
        first: true,
        last: true,
        empty: true,
      }
    }
    const rows = await budgetingApi.getBudgetsByUser(selectedUser.id)
    const withName = rows.map(r => ({
      ...r,
      userName: displayName(selectedUser),
    }))
    return {
      content: withName,
      totalElements: withName.length,
      totalPages: 1,
      number: 0,
      size: withName.length || 25,
      first: true,
      last: true,
      empty: withName.length === 0,
    }
  }

  function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["budgeting", "budget-cards"] })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await budgetingApi.deleteBudget(deleteTarget.id)
      toast.success("Budget deleted")
      setDeleteTarget(null)
      refresh()
    } catch {
      toast.error("Failed to delete budget")
    }
  }

  return (
    <PageShell
      title="Budget Cards"
      description="Monthly budget amounts by fee earner"
      action={(
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!selectedUser}
          onClick={() => {
            setDrawerMode("add")
            setEditInitial(undefined)
            setDrawerOpen(true)
          }}
        >
          Add Budget
        </Button>
      )}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
        <Autocomplete
          sx={{ minWidth: 280, flex: 1, maxWidth: 420 }}
          options={userOpts}
          loading={usersLoading}
          value={selectedUser}
          onChange={(_, v) => {
            setSelectedUser(v)
            setGridKey(k => k + 1)
          }}
          getOptionLabel={o => displayName(o)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Select User" size="small" />}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showInactive}
              onChange={e => {
                setShowInactive(e.target.checked)
                setSelectedUser(null)
                setGridKey(k => k + 1)
              }}
            />
          }
          label="Show Inactive Users"
        />
      </Box>

      {!selectedUser ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          Please select a user to view monthly budget details.
        </Typography>
      ) : (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Monthly Budgets for {displayName(selectedUser)}
          </Typography>
          <DataGrid
            key={`${selectedUser.id}-${gridKey}`}
            columns={[
              {
                field: "userName",
                header: "User",
                renderCell: v => String(v || displayName(selectedUser)),
              },
              { field: "year", header: "Year", renderCell: v => String(v ?? "—") },
              {
                field: "month",
                header: "Month",
                renderCell: v => monthName(Number(v ?? 0)),
              },
              {
                field: "amount",
                header: "Budget Amount",
                align: "right",
                renderCell: v => formatCurrency(Number(v ?? 0)),
              },
            ]}
            queryKey={["budgeting", "budget-cards", selectedUser.id, gridKey]}
            queryFn={queryFn}
            isPaginated={false}
            zebraStriping
            emptyState="No monthly budgets for this user."
            rowMenuItems={row => {
              const r = row as BudgetCardRow
              return [
                {
                  label: "Edit",
                  icon: <EditIcon fontSize="small" />,
                  onClick: () => {
                    setDrawerMode("edit")
                    setEditInitial({
                      id: r.id,
                      amount: String(r.amount),
                      year: String(r.year),
                      month: String(r.month),
                    })
                    setDrawerOpen(true)
                  },
                },
                {
                  label: "Delete",
                  icon: <DeleteOutlinedIcon fontSize="small" />,
                  color: "error",
                  onClick: () => setDeleteTarget(r),
                },
              ]
            }}
          />
        </>
      )}

      <BudgetCardDrawer
        open={drawerOpen}
        mode={drawerMode}
        userId={selectedUser?.id ?? ""}
        initial={editInitial}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success(drawerMode === "edit" ? "Budget updated" : "Budget added")
          refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete budget?"
        message="This monthly budget entry will be permanently removed."
        confirmLabel="Delete"
        severity="error"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />    </PageShell>
  )
}
