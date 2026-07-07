import type { Meta, StoryObj } from '@storybook/react'
import { DataGrid } from './DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'

const meta: Meta<typeof DataGrid> = {
  title: 'DataGrid/DataGrid',
  component: DataGrid,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', msw: { handlers: [] } },
}
export default meta

const mockData = {
  content: [
    { id:'1', name:'Mohammed Al Rashid', company:'Al Rashid Holdings', status:'active',   date:'2025-01-15' },
    { id:'2', name:'Emily Harper',       company:'',                   status:'inactive', date:'2025-02-10' },
    { id:'3', name:'Khalid Al Mazrouei', company:'KM Properties',      status:'active',   date:'2025-03-01' },
  ],
  totalElements: 3, totalPages: 1, number: 0, size: 25, first: true, last: true, empty: false,
}

export const Default: StoryObj<typeof DataGrid> = {
  args: {
    columns: [
      { field: 'name',    header: 'Name' },
      { field: 'company', header: 'Company' },
      { field: 'status',  header: 'Status', renderCell: (v) => <StatusBadge status={String(v)} /> },
      { field: 'date',    header: 'Date' },
    ],
    queryKey: ['storybook-demo'],
    queryFn: async () => mockData,
  },
}

export const WithFilters: StoryObj<typeof DataGrid> = {
  args: {
    ...Default.args,
    hasFilters: true,
    FilterPanel: ({ onSearch, onReset }) => (
      <div style={{ display:'flex', gap:8 }}>
        <input placeholder="Search…" style={{ padding:'6px 10px', border:'1px solid #E2E8F0', borderRadius:6 }}
          onChange={e => onSearch({ search: e.target.value })} />
        <button onClick={onReset}>Reset</button>
      </div>
    ),
  },
}

export const Loading: StoryObj<typeof DataGrid> = {
  args: {
    columns: Default.args!.columns,
    queryKey: ['storybook-loading'],
    queryFn: () => new Promise(() => {}), // never resolves = loading state
  },
}

export const Empty: StoryObj<typeof DataGrid> = {
  args: {
    columns: Default.args!.columns,
    queryKey: ['storybook-empty'],
    queryFn: async () => ({ content:[], totalElements:0, totalPages:0, number:0, size:25, first:true, last:true, empty:true }),
  },
}
