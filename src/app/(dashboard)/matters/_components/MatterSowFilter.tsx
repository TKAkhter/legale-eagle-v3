import { useEffect, useMemo, useState, type ReactNode } from "react"
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { mattersApi } from "@/api/matters"

/** Loads associated SOW matters and returns a scoped matterId + optional Filter SOW select. */
export function useSowMatterFilter(parentMatterId: string): {
  scopedMatterId: string
  filterEl: ReactNode
  isSelectedSubMatter: boolean
} {
  const q = useQuery({
    queryKey: ["matters", "associated", parentMatterId],
    queryFn: () => mattersApi.getAssociatedMatters(parentMatterId),
    enabled: !!parentMatterId,
  })
  const associated = q.data ?? []
  const defaultId = useMemo(() => {
    const parent = associated.find(a => a.subMatter === false)
    return parent?.id ?? associated[0]?.id ?? parentMatterId
  }, [associated, parentMatterId])

  const [selectedId, setSelectedId] = useState(parentMatterId)

  useEffect(() => {
    setSelectedId(defaultId)
  }, [defaultId])

  const scopedMatterId = associated.length ? selectedId || defaultId : parentMatterId
  const selected = associated.find(a => a.id === scopedMatterId)
  const isSelectedSubMatter = selected?.subMatter === true

  const filterEl = associated.length > 1 ? (
    <FormControl size="small" sx={{ mb: 1.5, minWidth: 240 }}>
      <InputLabel id={`sow-filter-${parentMatterId}`}>Filter SOW</InputLabel>
      <Select
        labelId={`sow-filter-${parentMatterId}`}
        label="Filter SOW"
        value={scopedMatterId}
        onChange={e => setSelectedId(String(e.target.value))}
      >
        {associated.map(item => (
          <MenuItem key={item.id} value={item.id}>
            {item.title || item.id}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  ) : null

  return { scopedMatterId, filterEl, isSelectedSubMatter }
}
