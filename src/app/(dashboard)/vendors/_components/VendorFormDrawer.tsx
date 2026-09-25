import { useEffect, useState } from "react"
import { Alert, Box, Button, IconButton, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useFieldArray, useForm } from "react-hook-form"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { vendorsApi } from "@/api/vendors"
import { toast } from "@/lib/toast"
import {
  emptyAdditionalContact,
  getDefaultVendorValues,
  vendorFromApi,
  vendorToPayload,
  type VendorFormValues,
} from "./vendorFormModel"

export function VendorFormDrawer({
  open,
  onClose,
  vendorId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  vendorId?: string
  onSuccess?: (id?: string) => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<VendorFormValues>({
    defaultValues: getDefaultVendorValues(),
  })
  const { fields, append, remove } = useFieldArray({ control, name: "contactPersons" })

  useEffect(() => {
    if (!open) {
      reset(getDefaultVendorValues())
      setSubmitError(null)
      return
    }
    if (!vendorId) return
    vendorsApi.getById(vendorId).then(v => {
      reset(vendorFromApi(v as Record<string, unknown>))
    }).catch(() => undefined)
  }, [open, vendorId, reset])

  async function onSubmit(data: VendorFormValues) {
    setSubmitError(null)
    if (!data.displayName.trim() && !data.companyName.trim()) {
      setSubmitError("Display name or company name is required")
      return
    }
    const payload = vendorToPayload({
      ...data,
      displayName: data.displayName.trim() || data.companyName.trim(),
      companyName: data.companyName.trim() || data.displayName.trim(),
    })
    try {
      if (vendorId) {
        await vendorsApi.update(vendorId, payload)
        toast.success("Vendor updated")
        onSuccess?.(vendorId)
      } else {
        const created = await vendorsApi.create(payload) as { id?: string }
        toast.success("Vendor created")
        onSuccess?.(created?.id)
      }
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save vendor",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={vendorId ? "Edit Vendor" : "New Vendor"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={vendorId ? "Update" : "Create"}
      width={560}
    >
      {submitError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      <FormSection title="Vendor">
        <ControlledInput name="displayName" control={control} label="Display Name" required />
        <ControlledInput name="companyName" control={control} label="Company Name" />
        <ControlledSelect
          name="vendorType"
          control={control}
          label="Vendor Type"
          options={[
            { value: "COMPANY", label: "Company" },
            { value: "PERSON", label: "Person" },
          ]}
        />
        <ControlledInput name="trnNo" control={control} label="TRN No" />
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} />
      </FormSection>

      <FormSection title="Billing Address">
        <ControlledInput name="billingAddress.street" control={control} label="Street" />
        <ControlledInput name="billingAddress.city" control={control} label="City" />
        <ControlledInput name="billingAddress.state" control={control} label="State" />
        <ControlledInput name="billingAddress.zip" control={control} label="ZIP" />
        <ControlledInput name="billingAddress.country" control={control} label="Country" />
      </FormSection>

      <FormSection title="Shipping Address">
        <ControlledInput name="shippingAddress.street" control={control} label="Street" />
        <ControlledInput name="shippingAddress.city" control={control} label="City" />
        <ControlledInput name="shippingAddress.state" control={control} label="State" />
        <ControlledInput name="shippingAddress.zip" control={control} label="ZIP" />
        <ControlledInput name="shippingAddress.country" control={control} label="Country" />
      </FormSection>

      <FormSection title="Contacts">
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{
              display: "grid",
              gap: 1.5,
              mb: 1,
              pb: 2,
              borderBottom: index < fields.length - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {index === 0 ? "Primary Contact" : `Contact ${index + 1}`}
              </Typography>
              {index > 0 && (
                <IconButton size="small" onClick={() => remove(index)} aria-label="Remove contact">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <ControlledInput name={`contactPersons.${index}.firstName`} control={control} label="First Name" />
            <ControlledInput name={`contactPersons.${index}.lastName`} control={control} label="Last Name" />
            <ControlledInput name={`contactPersons.${index}.email.emailId`} control={control} label="Email" />
            <Box sx={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 1 }}>
              <ControlledInput name={`contactPersons.${index}.phone.codeNo`} control={control} label="Code" />
              <ControlledInput name={`contactPersons.${index}.phone.phoneNo`} control={control} label="Phone" />
            </Box>
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append(emptyAdditionalContact())}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Contact
        </Button>
      </FormSection>
    </FormDrawer>
  )
}
