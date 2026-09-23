import { TextField, InputAdornment } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { useEffect, useState } from "react"

interface Props {
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  /** If true, debounce before calling onChange. Default false — parent Search button owns API. */
  debounceMs?: number
}

/**
 * Text text field for filter panels.
 * Updates parent local draft state only — does NOT call list APIs.
 */
export function SearchInput({
  value = "",
  onChange,
  placeholder = "Search...",
  debounceMs = 0,
}: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    if (!debounceMs) return
    const id = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(id)
  }, [local, debounceMs]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value)
        if (!debounceMs) onChange(e.target.value)
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
