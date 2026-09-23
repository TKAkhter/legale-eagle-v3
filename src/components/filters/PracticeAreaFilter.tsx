import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { lookups } from "@/data/static"

interface Props {
  value?: string
  onChange: (value: string) => void
  label?: string
  includeEmpty?: boolean
  sx?: object
}

/** Practice area dropdown — lookup only; does not trigger list APIs. */
export function PracticeAreaFilter({
  value = "",
  onChange,
  label = "Practice Area",
  includeEmpty = true,
  sx,
}: Props) {
  const { data = [] } = useQuery({
    queryKey: ["lookups", "practiceAreas"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return lookups.practiceAreas
      const r = await axiosClient.get("/api/practicearea/get", { params: { fetchtype: "all" } })
      return unwrapAxiosList<{ id?: string; name?: string }>(r.data)
    },
    staleTime: 10 * 60_000,
  })

  const names = data.map(a => a.name ?? "").filter(Boolean)

  return (
    <FormControl size="small" sx={{ minWidth: 180, ...sx }} fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={e => onChange(e.target.value)}>
        {includeEmpty && <MenuItem value=""><em>All</em></MenuItem>}
        {names.map(name => (
          <MenuItem key={name} value={name}>{name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
