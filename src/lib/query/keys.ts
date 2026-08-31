/**
 * keys.ts — Typed query key factory
 *
 * Centralising all query keys prevents cache collisions and makes
 * targeted invalidation easy: queryClient.invalidateQueries({ queryKey: QK.leads.all() })
 *
 * Pattern: QK.resource.scope(params) → QueryKey array
 */

export const QK = {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    me:      ()         => ['auth', 'me']              as const,
    menu:    ()         => ['auth', 'menu']            as const,
    session: ()         => ['auth', 'session']         as const,
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    all:           ()         => ['dashboard']                       as const,
    setup:         ()         => ['dashboard', 'setup']              as const,
    leadCount:     ()         => ['dashboard', 'leadCount']          as const,
    matterCount:   ()         => ['dashboard', 'matterCount']        as const,
    taskCount:     ()         => ['dashboard', 'taskCount']          as const,
    kpi:           ()         => ['dashboard', 'kpi']                as const,
    charts:        (type: string) => ['dashboard', 'charts', type]   as const,
    upcomingHearings: () => ['dashboard', 'upcomingHearings']        as const,
    openLeads:     ()         => ['dashboard', 'openLeads']          as const,
  },

  // ─── Leads ────────────────────────────────────────────────────────────────
  leads: {
    all:         ()              => ['leads']                        as const,
    list:        (filters: unknown) => ['leads', 'list', filters]    as const,
    myList:      (filters: unknown) => ['leads', 'my', filters]      as const,
    detail:      (id: string)   => ['leads', 'detail', id]           as const,
    followups:   (id: string)   => ['leads', 'followups', id]        as const,
    timeline:    (id: string)   => ['leads', 'timeline', id]         as const,
    statuses:    ()             => ['leads', 'statuses']             as const,
    sources:     ()             => ['leads', 'sources']              as const,
    shortInfo:   (q?: string)   => ['leads', 'shortInfo', q]         as const,
  },

  // ─── Clients ──────────────────────────────────────────────────────────────
  clients: {
    all:       ()                => ['clients']                      as const,
    list:      (filters: unknown)=> ['clients', 'list', filters]     as const,
    detail:    (id: string)      => ['clients', 'detail', id]        as const,
    shortInfo: (q?: string)      => ['clients', 'shortInfo', q]      as const,
    mini:      ()                => ['clients', 'mini']              as const,
  },

  // ─── Matters ──────────────────────────────────────────────────────────────
  matters: {
    all:       ()                => ['matters']                      as const,
    list:      (filters: unknown)=> ['matters', 'list', filters]     as const,
    detail:    (id: string)      => ['matters', 'detail', id]        as const,
    snap:      (id: string, type: string) => ['matters', 'snap', id, type] as const,
    shortInfo: (q?: string)      => ['matters', 'shortInfo', q]      as const,
    mini:      (clientId?: string) => ['matters', 'mini', clientId]  as const,
    byClient:  (clientId: string)  => ['matters', 'byClient', clientId] as const,
    checklist: (id: string)      => ['matters', 'checklist', id]     as const,
    closeForm: (id: string)      => ['matters', 'closeForm', id]     as const,
  },

  // ─── Activities / Time Logs ───────────────────────────────────────────────
  activities: {
    all:           ()                => ['activities']               as const,
    list:          (filters: unknown)=> ['activities', 'list', filters] as const,
    byMatter:      (id: string)      => ['activities', 'matter', id] as const,
    forApproval:   (filters: unknown)=> ['activities', 'approval', filters] as const,
    approved:      (filters: unknown)=> ['activities', 'approved', filters] as const,
    stopwatch:     ()                => ['activities', 'stopwatch']  as const,
    history:       (filters: unknown)=> ['activities', 'history', filters] as const,
  },

  // ─── Invoices ─────────────────────────────────────────────────────────────
  invoices: {
    all:      ()                => ['invoices']                      as const,
    list:     (filters: unknown)=> ['invoices', 'list', filters]     as const,
    detail:   (id: string)      => ['invoices', 'detail', id]        as const,
    approval: ()                => ['invoices', 'approval']          as const,
  },

  // ─── LFA ──────────────────────────────────────────────────────────────────
  lfa: {
    all:       ()                => ['lfa']                          as const,
    list:      (filters: unknown)=> ['lfa', 'list', filters]         as const,
    detail:    (id: string)      => ['lfa', 'detail', id]            as const,
    defaults:  ()                => ['lfa', 'defaults']              as const,
    approval:  ()                => ['lfa', 'approval']              as const,
    byClient:  (clientId: string)=> ['lfa', 'client', clientId]      as const,
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  tasks: {
    all:       ()                => ['tasks']                        as const,
    list:      (filters: unknown)=> ['tasks', 'list', filters]       as const,
    detail:    (id: string)      => ['tasks', 'detail', id]          as const,
    templates: ()                => ['tasks', 'templates']           as const,
    pending:   ()                => ['tasks', 'pending']             as const,
  },

  // ─── Hearings ─────────────────────────────────────────────────────────────
  hearings: {
    all:      ()                => ['hearings']                      as const,
    byMatter: (matterId: string)=> ['hearings', 'matter', matterId]  as const,
    monthly:  (y: number, m: number) => ['hearings', 'monthly', y, m] as const,
    types:    ()                => ['hearings', 'types']             as const,
    locations:()                => ['hearings', 'locations']         as const,
  },

  // ─── Calendar ─────────────────────────────────────────────────────────────
  calendar: {
    events: (range: unknown)  => ['calendar', 'events', range]       as const,
    byDate: (date: string)    => ['calendar', 'byDate', date]        as const,
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: {
    wip:             (f: unknown) => ['reports', 'wip', f]           as const,
    matterBilling:   (f: unknown) => ['reports', 'matterBilling', f] as const,
    departmentBilling:(f: unknown)=> ['reports', 'deptBilling', f]   as const,
    activityHistory: (f: unknown) => ['reports', 'activityHistory', f] as const,
    utilization:     (f: unknown) => ['reports', 'utilization', f]   as const,
    marginErosion:   (f: unknown) => ['reports', 'marginErosion', f] as const,
    billedAmount:    (f: unknown) => ['reports', 'billedAmount', f]  as const,
    collections:     (f: unknown) => ['reports', 'collections', f]   as const,
    lfa:             (f: unknown) => ['reports', 'lfa', f]           as const,
    procuredBy:      (f: unknown) => ['reports', 'procuredBy', f]    as const,
  },

  // ─── Users ────────────────────────────────────────────────────────────────
  users: {
    all:    ()             => ['users']                              as const,
    list:   ()             => ['users', 'list']                      as const,
    mini:   ()             => ['users', 'mini']                      as const,
    detail: (id: string)   => ['users', 'detail', id]                as const,
    byDept: (deptId: string) => ['users', 'byDept', deptId]          as const,
    rateCards: (id: string)  => ['users', 'rateCards', id]           as const,
    costCards: (id: string)  => ['users', 'costCards', id]           as const,
  },

  // ─── Admin / Utils ────────────────────────────────────────────────────────
  departments:  { list: () => ['departments', 'list']              as const },
  designations: { list: () => ['designations', 'list']             as const },
  practiceAreas:{ list: () => ['practiceAreas', 'list']            as const },
  groups:       {
    list: ()           => ['groups', 'list']                        as const,
    detail:(id: string)=> ['groups', 'detail', id]                  as const,
  },
  sessionRates: { list: () => ['sessionRates', 'list']             as const },
  sources:      { list: () => ['sources', 'list']                  as const },
  budgets:      { list:(f: unknown) => ['budgets', 'list', f]      as const },
  tickets:      { list:(f: unknown) => ['tickets', 'list', f]      as const },
  notifications:{ list:() => ['notifications', 'list']             as const },
} as const
