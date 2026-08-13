/**
 * dashboardStore.ts — dashboard widget customisation state.
 *
 * Persisted to localStorage so user preferences survive page refresh.
 *
 * Each widget has:
 *   id       — unique key
 *   visible  — show/hide toggle
 *   order    — sort order (lower = higher on page)
 *   size     — "full" | "half" (grid column span)
 *
 * Usage:
 *   const widgets = useDashboardStore(s => s.widgets)
 *   const toggle  = useDashboardStore(s => s.toggleWidget)
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type WidgetSize = "full" | "half"

export interface WidgetConfig {
  id:      string
  label:   string
  visible: boolean
  order:   number
  size:    WidgetSize
}

/** Default widget configuration — shown when user has no saved preferences */
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "kpi",      label: "KPI Cards",           visible: true,  order: 0, size: "full" },
  { id: "matters",  label: "Matter Activity",      visible: true,  order: 1, size: "half" },
  { id: "revenue",  label: "Revenue Breakdown",    visible: true,  order: 2, size: "half" },
  { id: "activity", label: "Recent Activity",      visible: true,  order: 3, size: "full" },
  { id: "hearings", label: "Upcoming Hearings",    visible: false, order: 4, size: "half" },
  { id: "tasks",    label: "My Tasks",             visible: false, order: 5, size: "half" },
]

interface DashboardState {
  widgets:       WidgetConfig[]
  /** Toggle widget visibility */
  toggleWidget:  (id: string) => void
  /** Move widget up in the order */
  moveUp:        (id: string) => void
  /** Move widget down in the order */
  moveDown:      (id: string) => void
  /** Reset to default layout */
  resetLayout:   () => void
  /** Get visible widgets sorted by order */
  getVisible:    () => WidgetConfig[]
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,

      toggleWidget: (id) =>
        set(s => ({
          widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
        })),

      moveUp: (id) =>
        set(s => {
          const sorted = [...s.widgets].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex(w => w.id === id)
          if (idx <= 0) return s
          // Swap orders with previous widget
          const prev = sorted[idx - 1]
          const curr = sorted[idx]
          return {
            widgets: s.widgets.map(w => {
              if (w.id === curr.id) return { ...w, order: prev.order }
              if (w.id === prev.id) return { ...w, order: curr.order }
              return w
            })
          }
        }),

      moveDown: (id) =>
        set(s => {
          const sorted = [...s.widgets].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex(w => w.id === id)
          if (idx >= sorted.length - 1) return s
          const next = sorted[idx + 1]
          const curr = sorted[idx]
          return {
            widgets: s.widgets.map(w => {
              if (w.id === curr.id) return { ...w, order: next.order }
              if (w.id === next.id) return { ...w, order: curr.order }
              return w
            })
          }
        }),

      resetLayout: () => set({ widgets: DEFAULT_WIDGETS }),

      getVisible: () =>
        get().widgets.filter(w => w.visible).sort((a, b) => a.order - b.order),
    }),
    {
      name:    "le-dashboard",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
