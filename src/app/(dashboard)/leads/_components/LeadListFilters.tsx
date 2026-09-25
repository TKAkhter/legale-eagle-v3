/**
 * Shared lead list filters — parity for `/leads` and `/my-leads`.
 * Matches LMS type + status tabs + name / practice area / source / dates.
 */
import { useState } from "react"
import { Box, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { SearchInput, PracticeAreaFilter, DateRangeFilter, FilterActions } from "@components/filters"
import type { FilterPanelProps } from "@components/data-grid/types"

export function LeadListFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>({
    type: "All",
    statusGroup: "Open",
    ...filters,
  })
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={String(f.type ?? "All")}
        onChange={(_, value) => value && setF(p => ({ ...p, type: value }))}
      >
        {["All", "People", "Company"].map(item => (
          <ToggleButton key={item} value={item}>{item === "People" ? "Individual" : item}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={String(f.statusGroup ?? "Open")}
        onChange={(_, value) => value && setF(p => ({ ...p, statusGroup: value }))}
      >
        {[
          { label: "All", value: "All" },
          { label: "Open", value: "Open" },
          { label: "Converted", value: "Converted" },
          { label: "Written Off", value: "Writeoff" },
          { label: "Repeated", value: "Repeated" },
        ].map(item => (
          <ToggleButton key={item.value} value={item.value}>{item.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
        <SearchInput
          value={String(f.searchText ?? "")}
          onChange={v => setF(p => ({ ...p, searchText: v }))}
          placeholder="Search by name..."
        />
        <PracticeAreaFilter
          value={String(f.practiceArea ?? "")}
          onChange={v => setF(p => ({ ...p, practiceArea: v }))}
        />
        <TextField
          size="small"
          label="Source Type"
          value={String(f.sourceType ?? "")}
          onChange={e => setF(p => ({ ...p, sourceType: e.target.value }))}
        />
        <DateRangeFilter
          fromDate={String(f.fromDate ?? "")}
          toDate={String(f.toDate ?? "")}
          onChange={v => setF(p => ({ ...p, ...v }))}
        />
        <FilterActions
          onSearch={() => onSearch(f)}
          onClear={() => { setF({ type: "All", statusGroup: "Open" }); onReset() }}
        />
      </Box>
    </Box>
  )
}
