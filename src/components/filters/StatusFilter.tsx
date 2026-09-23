import {
  Checkbox, FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Select,
} from "@mui/material"

export interface StatusOption {
  value: string
  label: string
}

interface SingleProps {
  value?: string
  onChange: (value: string) => void
  options: StatusOption[]
  label?: string
  includeAll?: boolean
  sx?: object
}

interface MultiProps {
  value: string[]
  onChange: (value: string[]) => void
  options: StatusOption[]
  label?: string
  sx?: object
  /** When selecting OPEN, also include RE_OPEN (matters parity). */
  openImpliesReopen?: boolean
}

/** Single-select status filter — local state only until Search is clicked. */
export function StatusFilter({
  value = "",
  onChange,
  options,
  label = "Status",
  includeAll = true,
  sx,
}: SingleProps) {
  return (
    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, maxWidth: '100%', ...sx }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={e => onChange(e.target.value)}>
        {includeAll && <MenuItem value="All">All</MenuItem>}
        {options.map(o => (
          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function withOpenImpliesReopen(next: string[]): string[] {
  if (next.includes("OPEN") && !next.includes("RE_OPEN")) return [...next, "RE_OPEN"]
  return next
}

/** Multi-select status filter — local state only until Search is clicked. */
export function StatusMultiFilter({
  value,
  onChange,
  options,
  label = "Status",
  sx,
  openImpliesReopen = false,
}: MultiProps) {
  return (
    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, maxWidth: '100%', ...sx }} fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={e => {
          const next = Array.isArray(e.target.value) ? e.target.value.map(String) : []
          onChange(openImpliesReopen ? withOpenImpliesReopen(next) : next)
        }}
        input={<OutlinedInput label={label} />}
        renderValue={selected =>
          selected
            .map(v => options.find(o => o.value === v)?.label ?? v)
            .join(", ")
        }
      >
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox checked={value.includes(option.value)} size="small" />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export const MATTER_STATUS_OPTIONS: StatusOption[] = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSE", label: "Close" },
  { value: "RE_OPEN", label: "Reopen" },
]

export const CLIENT_STATUS_OPTIONS: StatusOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
]

export const LEAD_STATUS_GROUP_OPTIONS: StatusOption[] = [
  { value: "All", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Converted", label: "Converted" },
  { value: "Write_Off", label: "Write Off" },
]
