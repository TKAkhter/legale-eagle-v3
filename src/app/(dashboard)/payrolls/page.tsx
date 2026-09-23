import { useEffect, useMemo, useState } from "react"
import { Alert, Button, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { useForm } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { ControlledAsyncSelect } from "@components/forms/ControlledAsyncSelect"
import { payrollApi } from "@/api/payroll"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

type PayrollForm = {
  userGroupId: string
  payrollUserId: string
  gradeId: string
  basicAmount: string
  incomeId: string
  incomeAmount: string
  deductionId: string
  deductionAmount: string
}

function CreatePayrollDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<PayrollForm>({
    defaultValues: {
      userGroupId: "", payrollUserId: "", gradeId: "", basicAmount: "0",
      incomeId: "", incomeAmount: "", deductionId: "", deductionAmount: "",
    },
  })
  const groupId = watch("userGroupId")
  const gradeId = watch("gradeId")

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "min", "payroll"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return [{ id: "g1", name: "Associates" }]
      const r = await axiosClient.get("/api/group/get")
      return r.data?.data ?? r.data ?? []
    },
    enabled: open,
  })

  const { data: users = [] } = useQuery({
    queryKey: ["groups", "users", groupId],
    queryFn: async () => {
      if (!groupId) return []
      if (env.USE_STATIC_DATA) return [{ id: "u1", firstName: "Sarah", lastName: "Johnson" }]
      const r = await axiosClient.get("/api/group/users/by/group", { params: { groupId } })
      return r.data?.data ?? r.data ?? []
    },
    enabled: open && !!groupId,
  })

  const { data: grades = [] } = useQuery({
    queryKey: ["hr", "grades"],
    queryFn: () => payrollApi.getGrades(),
    enabled: open,
  })
  const { data: incomes = [] } = useQuery({
    queryKey: ["hr", "incomes"],
    queryFn: () => payrollApi.getIncomes(),
    enabled: open,
  })
  const { data: deductions = [] } = useQuery({
    queryKey: ["hr", "deductions"],
    queryFn: () => payrollApi.getDeductions(),
    enabled: open,
  })

  useEffect(() => { if (!open) reset() }, [open, reset])

  useEffect(() => {
    const g = (grades as Record<string, unknown>[]).find(x => String(x.id) === gradeId)
    if (g?.basicSalary != null) setValue("basicAmount", String(g.basicSalary))
  }, [gradeId, grades, setValue])

  const groupOpts = useMemo(
    () => (groups as Record<string, string>[]).map(g => ({ value: g.id, label: String(g.name ?? g.id) })),
    [groups],
  )
  const userOpts = useMemo(
    () => (users as Record<string, string>[]).map(u => ({
      value: u.id,
      label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id,
    })),
    [users],
  )
  const gradeOpts = useMemo(
    () => (grades as Record<string, unknown>[]).filter(g => g.status !== false).map(g => ({
      value: String(g.id),
      label: String(g.name ?? g.id),
    })),
    [grades],
  )
  const incomeOpts = useMemo(
    () => (incomes as Record<string, unknown>[]).filter(i => i.status !== false).map(i => ({
      value: String(i.id), label: String(i.name ?? i.id),
    })),
    [incomes],
  )
  const deductionOpts = useMemo(
    () => (deductions as Record<string, unknown>[]).filter(d => d.status !== false).map(d => ({
      value: String(d.id), label: String(d.name ?? d.id),
    })),
    [deductions],
  )

  async function onSubmit(data: PayrollForm) {
    setSubmitError(null)
    if (!data.userGroupId || !data.payrollUserId || !data.gradeId) {
      setSubmitError("Group, user, and grade are required")
      return
    }
    try {
      const incomesPayload = data.incomeId
        ? [{ incomeId: data.incomeId, amount: Number(data.incomeAmount) || 0 }]
        : []
      const deductionsPayload = data.deductionId
        ? [{ deductionId: data.deductionId, amount: Number(data.deductionAmount) || 0 }]
        : []
      toast.success(await payrollApi.create({
        userGroupId: data.userGroupId,
        payrollUserId: data.payrollUserId,
        gradeId: data.gradeId,
        basicAmount: Number(data.basicAmount) || 0,
        incomes: incomesPayload,
        deductions: deductionsPayload,
      }))
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to create payroll",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="New Payroll"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel="Create"
      width={520}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Employee">
        <ControlledSelect name="userGroupId" control={control} label="User Group" options={groupOpts} required />
        <ControlledAsyncSelect name="payrollUserId" control={control} label="User" options={userOpts} required />
        <ControlledSelect name="gradeId" control={control} label="Grade" options={gradeOpts} required />
        <ControlledInput name="basicAmount" control={control} label="Basic Amount" />
      </FormSection>
      <FormSection title="Income (optional)">
        <ControlledSelect name="incomeId" control={control} label="Income Type" options={[{ value: "", label: "None" }, ...incomeOpts]} />
        <ControlledInput name="incomeAmount" control={control} label="Income Amount" />
      </FormSection>
      <FormSection title="Deduction (optional)">
        <ControlledSelect name="deductionId" control={control} label="Deduction Type" options={[{ value: "", label: "None" }, ...deductionOpts]} />
        <ControlledInput name="deductionAmount" control={control} label="Deduction Amount" />
      </FormSection>
    </FormDrawer>
  )
}

export default function PayrollsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)

  return (
    <PageShell
      title="Payrolls"
      description="Employee payroll records"
      action={(
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDrawerOpen(true)}>
          New Payroll
        </Button>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "payrollUser",
            header: "User",
            renderCell: (v) => {
              const u = v as { firstName?: string; lastName?: string } | null
              return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—" : "—"
            },
          },
          {
            field: "basicAmount",
            header: "Basic Salary",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "incomes",
            header: "Incomes",
            renderCell: (v) => {
              const list = (v as { amount?: number; income?: { name?: string } }[]) ?? []
              if (!list.length) return "—"
              return list.map((n, i) => (
                <Typography key={i} variant="body2" component="div">
                  {n.income?.name ?? "—"}: {formatCurrency(Number(n.amount ?? 0))}
                </Typography>
              ))
            },
          },
          {
            field: "deductions",
            header: "Deductions",
            renderCell: (v) => {
              const list = (v as { amount?: number; deduction?: { name?: string } }[]) ?? []
              if (!list.length) return "—"
              return list.map((n, i) => (
                <Typography key={i} variant="body2" component="div">
                  {n.deduction?.name ?? "—"}: {formatCurrency(Number(n.amount ?? 0))}
                </Typography>
              ))
            },
          },
          {
            field: "grade",
            header: "Grade",
            renderCell: (v, row) => {
              const g = (v ?? (row as Record<string, unknown>).grade) as { name?: string } | undefined
              return String(g?.name ?? "—")
            },
          },
        ]}
        queryKey={["payrolls", "list"]}
        queryFn={(p: GridParams) => payrollApi.getAll(p)}
        zebraStriping
      />
      <CreatePayrollDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["payrolls"] })
          setGridKey(k => k + 1)
        }}
      />
    </PageShell>
  )
}
