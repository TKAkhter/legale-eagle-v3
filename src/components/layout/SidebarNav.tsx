/**
 * SidebarNav.tsx — renders the sidebar navigation items.
 *
 * Nav source (controlled by VITE_DYNAMIC_NAV env flag):
 *   true  → filters navigationConfig by what /api/user/get/access/menu returned.
 *            Only shows items the logged-in user has permission to see.
 *   false → shows all items from navigationConfig (useful for dev/demo without BE).
 *
 * Static data mode (VITE_USE_STATIC_DATA=true):
 *   Uses the static menu from src/data/static.ts which mirrors the API shape.
 *
 * Collapsed state:
 *   - Shows only icons (no labels)
 *   - Tooltips appear on hover to show the label
 *   - Sub-menus are hidden when collapsed
 *
 * onNavClick:
 *   Called when a nav item is clicked.
 *   On mobile, this closes the overlay drawer.
 */
import { useState, useMemo } from "react"
import {
  List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Tooltip, Box, Skeleton,
} from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import FindInPageOutlinedIcon from '@mui/icons-material/FindInPageOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import ReviewsOutlinedIcon from '@mui/icons-material/ReviewsOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import PriceChangeOutlinedIcon from '@mui/icons-material/PriceChangeOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import GroupWorkOutlinedIcon from '@mui/icons-material/GroupWorkOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined'
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import RequestPageOutlinedIcon from '@mui/icons-material/RequestPageOutlined'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { useAuthStore }  from "@lib/store/authStore"
import { hasPermission } from "@lib/auth/permissions"
import { navigationConfig, type NavItem } from "@config/navigation"
import { useTranslation } from "react-i18next"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import { buildNavFromMenu, flattenMenuUrls } from "@/lib/nav/buildNavFromMenu"
import { collectAllowedPaths, isPathAllowed } from "@/lib/nav/legacyUrlMap"

const ICONS = {
  DashboardOutlined: DashboardOutlinedIcon,
  TrendingUpOutlined: TrendingUpOutlinedIcon,
  PersonSearchOutlined: PersonSearchOutlinedIcon,
  BusinessOutlined: BusinessOutlinedIcon,
  GavelOutlined: GavelOutlinedIcon,
  FolderOutlined: FolderOutlinedIcon,
  FindInPageOutlined: FindInPageOutlinedIcon,
  AccessTimeOutlined: AccessTimeOutlinedIcon,
  CalendarMonthOutlined: CalendarMonthOutlinedIcon,
  TaskAltOutlined: TaskAltOutlinedIcon,
  ReceiptLongOutlined: ReceiptLongOutlinedIcon,
  FactCheckOutlined: FactCheckOutlinedIcon,
  AssignmentTurnedInOutlined: AssignmentTurnedInOutlinedIcon,
  AssignmentOutlined: AssignmentOutlinedIcon,
  ArticleOutlined: ArticleOutlinedIcon,
  DescriptionOutlined: DescriptionOutlinedIcon,
  LibraryBooksOutlined: LibraryBooksOutlinedIcon,
  SummarizeOutlined: SummarizeOutlinedIcon,
  BarChartOutlined: BarChartOutlinedIcon,
  SpeedOutlined: SpeedOutlinedIcon,
  HistoryOutlined: HistoryOutlinedIcon,
  TrendingDownOutlined: TrendingDownOutlinedIcon,
  GroupsOutlined: GroupsOutlinedIcon,
  GroupOutlined: GroupOutlinedIcon,
  EventNoteOutlined: EventNoteOutlinedIcon,
  ReviewsOutlined: ReviewsOutlinedIcon,
  PendingActionsOutlined: PendingActionsOutlinedIcon,
  HowToRegOutlined: HowToRegOutlinedIcon,
  CloudOutlined: CloudOutlinedIcon,
  AccountBalanceWalletOutlined: AccountBalanceWalletOutlinedIcon,
  CreditCardOutlined: CreditCardOutlinedIcon,
  PriceChangeOutlined: PriceChangeOutlinedIcon,
  SavingsOutlined: SavingsOutlinedIcon,
  AdminPanelSettingsOutlined: AdminPanelSettingsOutlinedIcon,
  ManageAccountsOutlined: ManageAccountsOutlinedIcon,
  GroupWorkOutlined: GroupWorkOutlinedIcon,
  LockOutlined: LockOutlinedIcon,
  LocationOnOutlined: LocationOnOutlinedIcon,
  SettingsOutlined: SettingsOutlinedIcon,
  ConfirmationNumberOutlined: ConfirmationNumberOutlinedIcon,
  WorkOutlineOutlined: WorkOutlineOutlinedIcon,
  PaidOutlined: PaidOutlinedIcon,
  AccountBalanceOutlined: AccountBalanceOutlinedIcon,
  CollectionsBookmarkOutlined: CollectionsBookmarkOutlinedIcon,
  TimerOutlined: TimerOutlinedIcon,
  ReceiptOutlined: ReceiptOutlinedIcon,
  CheckCircleOutlined: CheckCircleOutlinedIcon,
  IntegrationInstructionsOutlined: IntegrationInstructionsOutlinedIcon,
  PeopleOutlined: PeopleOutlinedIcon,
  RequestPageOutlined: RequestPageOutlinedIcon,
  RateReviewOutlined: RateReviewOutlinedIcon,
} as const

interface Props {
  collapsed:    boolean
  /** Called when any nav item is clicked (used to close mobile drawer) */
  onNavClick?:  () => void
}

export function SidebarNav({ collapsed, onNavClick }: Props) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { t }       = useTranslation()
  const menuItems   = useAuthStore(s => (s as { menuItems?: unknown[] }).menuItems ?? [])
  const permissions = (useAuthStore(s => (s as { permissions?: Set<string> }).permissions) ?? new Set<string>()) as Set<string>

  // Track which groups are open in the nav
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  /**
   * Dynamic nav (old LMS parity): render menu from API URLs, remapped to v3 paths.
   * Static nav: full navigationConfig (dev / DYNAMIC_NAV=false).
   */
  const navItems = useMemo(() => {
    if (!env.DYNAMIC_NAV) return navigationConfig
    if (!menuItems.length) return []
    return buildNavFromMenu(menuItems)
  }, [menuItems])

  /**
   * Allowed URL set — used only when falling back to filtering navigationConfig.
   * Includes legacy → v3 remaps so old BE urls unlock new paths.
   */
  const allowedUrls = useMemo(() => {
    if (!env.DYNAMIC_NAV) return null
    return collectAllowedPaths(flattenMenuUrls(menuItems))
  }, [menuItems])

  /**
   * Check if a nav item should be shown.
   * - Dynamic + API-built tree: already permission-filtered by BE → show
   * - Dynamic + static config fallback: must match remapped allowed URLs
   * - Permission check still applies when permission key is set
   */
  function isVisible(item: NavItem): boolean {
    if (item.permission && !hasPermission(permissions, item.permission)) return false
    if (!env.DYNAMIC_NAV) return true
    // API-built items have no permission keys — trust BE menu
    if (!item.permission) return true
    return isPathAllowed(item.path, allowedUrls)
  }

  function isActive(path?: string): boolean {
    if (!path) return false
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  function toggleGroup(id: string) {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleClick(item: NavItem) {
    if (item.children?.length) {
      toggleGroup(item.id)
    } else if (item.path) {
      logger.info("SidebarNav", `Navigating to ${item.path}`)
      navigate(item.path)
      onNavClick?.()  // close mobile drawer if open
    }
  }

  function renderIcon(iconName?: string) {
    if (!iconName) return null
  
    const Icon = ICONS[iconName as keyof typeof ICONS]
  
    if (!Icon) {
      logger.warn("SidebarNav", `Unknown navigation icon: ${iconName}`)
      return null
    }
  
    return <Icon fontSize="small" />
  }

  /** Render one nav item (recursively for children) */
  function renderItem(item: NavItem, depth = 0): React.ReactNode {
    if (!isVisible(item)) return null

    const hasChildren = (item.children?.length ?? 0) > 0
    const active      = isActive(item.path)
    // Auto-open group if a child is currently active
    const childActive = item.children?.some(c => isActive(c.path))
    const isOpen      = openGroups[item.id] ?? !!childActive

    const button = (
      <ListItemButton
        selected={active}
        onClick={() => handleClick(item)}
        sx={{
          mx: 1,
          borderRadius: "6px",
          mb: 0.25,
          pl: collapsed ? 1.5 : 1.5 + depth * 1.5,
          pr: 1.5,
          py: 0.75,
          minHeight: 40,
          // Smooth background transition on hover/select
          transition: "background-color 150ms ease, padding 200ms ease",
          "&.Mui-selected": {
            bgcolor: "action.selected",
            "& .MuiListItemIcon-root": { color: "secondary.main" },
          },
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {/* Icon — always visible, colour changes on active */}
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 32,
            mr: collapsed ? 0 : 1,
            color: active ? "secondary.main" : "text.secondary",
            justifyContent: "center",
            transition: "color 150ms ease",
          }}
        >
          {renderIcon(item.icon)}
        </ListItemIcon>

        {/* Label — hidden when sidebar is collapsed */}
        {!collapsed && (
          <ListItemText
            primary={t(`nav.${item.id}`, { defaultValue: item.title })}
            slotProps={{
              primary: {
                sx: {
                  fontSize: depth > 0 ? 12.5 : 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "secondary.main" : "text.primary",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 150ms ease",
                },
              },
            }}
          />
        )}

        {/* Expand/collapse chevron for groups */}
        {!collapsed && hasChildren && (
          <Box
            sx={{
              color: "text.secondary",
              display: "flex",
              transition: "transform 200ms ease",
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }}
          >
            {isOpen
              ? <ExpandMoreIcon sx={{ fontSize: 16 }} />
              : <ChevronRightIcon sx={{ fontSize: 16 }} />}
          </Box>
        )}
      </ListItemButton>
    )

    // Wrap with tooltip when collapsed (shows label on hover)
    const wrapped = collapsed && item.path
      ? (
        <Tooltip
          key={item.id}
          title={t(`nav.${item.id}`, { defaultValue: item.title })}
          placement="right"
          arrow
        >
          <span>{button}</span>
        </Tooltip>
      )
      : <span key={item.id}>{button}</span>

    if (!hasChildren) return wrapped

    // Render group with collapsible children
    return (
      <Box key={item.id}>
        {wrapped}
        <Collapse in={!collapsed && isOpen} timeout={200} unmountOnExit>
          <List disablePadding>
            {item.children!.map(child => renderItem(child, depth + 1))}
          </List>
        </Collapse>
      </Box>
    )
  }

  // Show skeleton while menu is loading (dynamic nav mode)
  const menuLoaded = !env.DYNAMIC_NAV || menuItems.length > 0
  if (!menuLoaded) {
    return (
      <List disablePadding sx={{ pt: 1, px: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Box key={`nav-sk-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75, mb: 0.25 }}>
            <Skeleton variant="circular" width={20} height={20} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
            {!collapsed && <Skeleton width={100} height={16} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />}
          </Box>
        ))}
      </List>
    )
  }

  return (
    <List disablePadding sx={{ pt: 1 }}>
      {navItems.map(item => renderItem(item))}
    </List>
  )
}
