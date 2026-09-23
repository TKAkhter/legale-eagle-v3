import { Autocomplete, TextField, Avatar, Box, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { QK } from "@lib/query/keys"
import { unwrapAxiosList } from "@lib/utils/unwrap"
import { env } from "@/config/env"
import { lookups } from "@/data/static"

interface UserOpt {
  id: string
  firstName?: string
  lastName?: string
  fullName?: string
  profilePic?: string
}

interface SingleProps {
  multiple?: false
  value?: string
  onChange: (id?: string) => void
  label?: string
}

interface MultiProps {
  multiple: true
  value: string[]
  onChange: (ids: string[]) => void
  label?: string
}

type Props = SingleProps | MultiProps

function labelOf(u: UserOpt) {
  return u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id
}

/** User dropdown — lookup only; parent Search button owns list API. */
export function UserSelectFilter(props: Props) {
  const label = props.label ?? "User"
  const { data = [] } = useQuery({
    queryKey: QK.users.mini(),
    queryFn: async () => {
      if (env.USE_STATIC_DATA) return lookups.users as UserOpt[]
      const r = await axiosClient.get("/api/user/get/min")
      return unwrapAxiosList<UserOpt>(r.data)
    },
    staleTime: 5 * 60 * 1000,
  })

  if (props.multiple) {
    const selected = data.filter(u => props.value.includes(u.id))
    return (
      <Autocomplete
        multiple
        size="small"
        options={data}
        value={selected}
        getOptionLabel={labelOf}
        onChange={(_, v) => props.onChange(v.map(u => u.id))}
        sx={{ minWidth: 220 }}
        renderInput={(params) => <TextField {...params} label={label} />}
        renderOption={(liProps, o) => (
          <Box component="li" {...liProps} key={o.id} sx={{ gap: 1, display: "flex", alignItems: "center" }}>
            <Avatar src={o.profilePic} sx={{ width: 24, height: 24, fontSize: 12 }}>
              {(o.firstName?.[0] ?? o.fullName?.[0] ?? "?").toUpperCase()}
            </Avatar>
            <Typography variant="body2">{labelOf(o)}</Typography>
          </Box>
        )}
      />
    )
  }

  const selected = data.find(u => u.id === props.value) ?? null
  return (
    <Autocomplete
      size="small"
      options={data}
      value={selected}
      getOptionLabel={labelOf}
      onChange={(_, v) => props.onChange(v?.id)}
      sx={{ minWidth: 220 }}
      renderInput={(params) => <TextField {...params} label={label} />}
      renderOption={(liProps, o) => (
        <Box component="li" {...liProps} key={o.id} sx={{ gap: 1, display: "flex", alignItems: "center" }}>
          <Avatar src={o.profilePic} sx={{ width: 24, height: 24, fontSize: 12 }}>
            {(o.firstName?.[0] ?? o.fullName?.[0] ?? "?").toUpperCase()}
          </Avatar>
          <Typography variant="body2">{labelOf(o)}</Typography>
        </Box>
      )}
    />
  )
}
