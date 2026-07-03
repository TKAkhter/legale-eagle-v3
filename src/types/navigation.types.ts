/**
 * navigation.types.ts
 * Types for the sidebar navigation system.
 */

export interface NavItem {
  id: string
  title: string            // i18n key e.g. "nav.leads"
  path?: string
  icon?: string            // Material UI icon name
  permission?: string      // PERMISSIONS constant — hide if user lacks it
  children?: NavItem[]
  badge?: string | number  // dynamic count badge
  dividerAfter?: boolean
  external?: boolean       // opens in new tab
}

export interface NavGroup {
  id: string
  title: string
  items: NavItem[]
}

/** Active state for a nav item — used by SidebarNav to highlight */
export interface NavItemState {
  isActive: boolean
  isOpen: boolean          // for parent items with children
}
