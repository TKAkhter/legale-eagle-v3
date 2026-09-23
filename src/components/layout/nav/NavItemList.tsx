/**
 * Shared nav list renderer — used by StaticSidebarNav and DynamicSidebarNav.
 * Active state uses exact path match (and true nested children only).
 */
import { useState } from "react"
import {
  List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Tooltip, Box,
} from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined"
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined"
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined"
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined"
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined"
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined"
import FindInPageOutlinedIcon from "@mui/icons-material/FindInPageOutlined"
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined"
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined"
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined"
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined"
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined"
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined"
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined"
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined"
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined"
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined"
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined"
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined"
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined"
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined"
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined"
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined"
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined"
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined"
import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined"
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined"
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined"
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined"
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined"
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined"
import PriceChangeOutlinedIcon from "@mui/icons-material/PriceChangeOutlined"
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined"
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined"
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined"
import GroupWorkOutlinedIcon from "@mui/icons-material/GroupWorkOutlined"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined"
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined"
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined"
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined"
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined"
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined"
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined"
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined"
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined"
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined"
import IntegrationInstructionsOutlinedIcon from "@mui/icons-material/IntegrationInstructionsOutlined"
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined"
import RequestPageOutlinedIcon from "@mui/icons-material/RequestPageOutlined"
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined"
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined"
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined"
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined"
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined"
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined"
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined"
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined"
import { useTranslation } from "react-i18next"
import type { NavItem } from "@config/navigation"
import { logger } from "@/lib/logger"

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
  AnalyticsOutlined: AnalyticsOutlinedIcon,
  PaymentsOutlined: PaymentsOutlinedIcon,
  PercentOutlined: PercentOutlinedIcon,
  EmojiEventsOutlined: EmojiEventsOutlinedIcon,
  HourglassBottomOutlined: HourglassBottomOutlinedIcon,
  StorefrontOutlined: StorefrontOutlinedIcon,
  EventAvailableOutlined: EventAvailableOutlinedIcon,
} as const

export interface NavListProps {
  items: NavItem[]
  collapsed: boolean
  onNavClick?: () => void
  /** Optional visibility gate (static nav uses permissions). */
  isVisible?: (item: NavItem) => boolean
}

function collectPaths(items: NavItem[], out: string[] = []): string[] {
  for (const item of items) {
    if (item.path) out.push(item.path)
    if (item.children?.length) collectPaths(item.children, out)
  }
  return out
}

/**
 * Exact match wins. Prefix match only when no other nav path is a longer
 * match for the current pathname (prevents /dashboard lighting up analytics).
 */
export function pathIsActive(pathname: string, path: string | undefined, allPaths: string[]): boolean {
  if (!path) return false
  if (pathname === path) return true
  if (!pathname.startsWith(path + "/")) return false
  // Another leaf is a more specific match → this parent/sibling is not active
  const longer = allPaths.some(
    (p) => p !== path && p.length > path.length && (pathname === p || pathname.startsWith(p + "/")),
  )
  return !longer
}

export function NavItemList({ items, collapsed, onNavClick, isVisible }: NavListProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const allPaths = collectPaths(items)

  function visible(item: NavItem) {
    return isVisible ? isVisible(item) : true
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleClick(item: NavItem) {
    if (item.children?.length) {
      toggleGroup(item.id)
      return
    }
    if (!item.path) return
    logger.info("SidebarNav", `Navigating to ${item.path}`)
    navigate(item.path)
    onNavClick?.()
  }

  function renderIcon(iconName?: string) {
    if (!iconName) return null
    const Icon = ICONS[iconName as keyof typeof ICONS]
    if (!Icon) return <FolderOutlinedIcon fontSize="small" />
    return <Icon fontSize="small" />
  }

  function labelOf(item: NavItem) {
    // Dynamic items use plain menuName as title; static use i18n keys
    if (item.title.startsWith("nav.")) {
      return t(item.title, { defaultValue: item.id })
    }
    return t(`nav.${item.id}`, { defaultValue: item.title })
  }

  function renderItem(item: NavItem, depth = 0): React.ReactNode {
    if (!visible(item)) return null

    const hasChildren = (item.children?.length ?? 0) > 0
    const active = pathIsActive(location.pathname, item.path, allPaths)
    const childActive = item.children?.some((c) => pathIsActive(location.pathname, c.path, allPaths))
    const isOpen = openGroups[item.id] ?? !!childActive

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
          transition: "background-color 150ms ease, padding 200ms ease",
          "&.Mui-selected": {
            bgcolor: "action.selected",
            "& .MuiListItemIcon-root": { color: "secondary.main" },
          },
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 32,
            mr: collapsed ? 0 : 1,
            color: active ? "secondary.main" : "text.secondary",
            justifyContent: "center",
          }}
        >
          {renderIcon(item.icon)}
        </ListItemIcon>

        {!collapsed && (
          <ListItemText
            primary={labelOf(item)}
            slotProps={{
              primary: {
                sx: {
                  fontSize: depth > 0 ? 12.5 : 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "secondary.main" : "text.primary",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              },
            }}
          />
        )}

        {!collapsed && hasChildren && (
          <Box sx={{ color: "text.secondary", display: "flex", transform: isOpen ? "none" : "rotate(-90deg)" }}>
            {isOpen ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
          </Box>
        )}
      </ListItemButton>
    )

    const wrapped = collapsed && item.path ? (
      <Tooltip key={item.id} title={labelOf(item)} placement="right" arrow>
        <span>{button}</span>
      </Tooltip>
    ) : (
      <span key={item.id}>{button}</span>
    )

    if (!hasChildren) return wrapped

    return (
      <Box key={item.id}>
        {wrapped}
        <Collapse in={!collapsed && isOpen} timeout={200} unmountOnExit>
          <List disablePadding>
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </List>
        </Collapse>
      </Box>
    )
  }

  return (
    <List disablePadding sx={{ pt: 1 }}>
      {items.map((item) => renderItem(item))}
    </List>
  )
}
