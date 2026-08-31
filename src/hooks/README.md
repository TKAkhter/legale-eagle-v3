# hooks/

Custom React hooks for the LegalEagle app.

## Two patterns — which to use?

### Pattern A: Direct api/ call in queryFn (preferred for pages)

Most pages call the api/ wrapper directly inside their queryFn:

```tsx
const { data } = useQuery({
  queryKey: ["leads","list",params],
  queryFn:  () => leadsApi.getAll(params),
})
```

✅ Simple, readable, obvious — recommended for junior devs.

### Pattern B: Custom hook (for reusable logic)

Use a custom hook when the SAME query is needed in multiple components,
or when the query has complex logic (polling, optimistic updates, etc.):

```tsx
// hooks/useLeads.ts
export const useLeadsList = (p: GridParams) =>
  useQuery({ queryKey: ["leads","list",p], queryFn: () => leadsApi.getAll(p) })

// In component:
const { data } = useLeadsList(params)
```

✅ Use for shared queries (e.g. lookup dropdowns used in multiple drawers).
❌ Don't create a hook just to wrap a single useQuery — adds unnecessary indirection.

## Hooks in this folder

| Hook | Purpose |
|------|---------|
| `useLeads` | Lead list + detail + followups |
| `useClients` | Client list + detail |
| `useMatters` | Matter list + detail |
| `useBilling` | Invoice list + detail |
| `useTasks` | Task list + detail |
| `useAdmin` | Users, groups, lookups (shared across many drawers) |
| `usePermission` | Check if user has a specific permission |
| `useUrlState` | Sync pagination/sort/filters with URL |
| `useDebounce` | Debounce a value (used in search inputs) |
| `useRTL` | Get current text direction (LTR/RTL) |
| `useFormSubmit` | Standardised form submit with loading/error state |
| `useExportBlob` | Download a Blob file from an API response |
