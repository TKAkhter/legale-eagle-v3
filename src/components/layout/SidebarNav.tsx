import { useState } from 'react'
import {
  List, ListItemButton, ListItemIcon, ListItemText, Collapse, Tooltip, Box,
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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
import { useAuthStore } from '@lib/store/authStore'
import { hasPermission } from '@lib/auth/permissions'
import { navigationConfig, type NavItem } from '@config/navigation'
import { useTranslation } from 'react-i18next'

// Curated icon map — avoids importing all 3,000+ MUI icons at once
const ICON_MAP: Record<string, React.ElementType> = {
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
  ReceiptOutlined: ReceiptOutlinedIcon,
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
  CheckCircleOutlined: CheckCircleOutlinedIcon,
  IntegrationInstructionsOutlined: IntegrationInstructionsOutlinedIcon,
}

function NavIcon({ name }: { name?: string }) {
  if (!name) return null
  const Icon = ICON_MAP[name]
  return Icon ? <Icon fontSize="small" /> : null
}

interface Props { collapsed: boolean }

export function SidebarNav({ collapsed }: Props) {
  const { t } = useTranslation('nav')
  const permissions = useAuthStore((s) => s.menuItems)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuItems: any[] = (useAuthStore as any)(((s: any) => s.menuItems))
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function filterItems(items: NavItem[]): NavItem[] {
    // Use menu items from API to determine visibility.
    // If the menu has loaded, only show items whose path appears in the API menu.
    // If not loaded yet (empty), show all items (prevents blank sidebar on load).
    const apiUrls = new Set(menuItems.map((m) => m.url ?? ""))
    const menuLoaded = menuItems.length > 0

    return items
      .filter(item => {
        if (!item.path) return true  // group headers always show
        if (!menuLoaded) return true // not loaded yet — show all
        return apiUrls.has(item.path)
      })
      .map(item =>
        item.children
          ? { ...item, children: filterItems(item.children) }
          : item
      )
      .filter(item => !item.children || item.children.length > 0)
  }

  const items = filterItems([...navigationConfig])

  function renderItem(item: NavItem, depth = 0): React.ReactNode {
    const hasChildren = item.children && item.children.length > 0
    const isActive = item.path ? location.pathname === item.path || location.pathname.startsWith(item.path + '/') : false
    const isOpen = open[item.id] ?? false
    const label = t(item.id, { defaultValue: item.title })

    const btn = (
      <ListItemButton
        key={item.id}
        selected={isActive}
        onClick={() => {
          if (hasChildren) setOpen(p => ({ ...p, [item.id]: !p[item.id] }))
          else if (item.path) navigate(item.path)
        }}
        sx={{
          pl: collapsed ? 1.5 : 2 + depth * 2,
          borderRadius: 1, mx: 1, mb: 0.25,
          justifyContent: collapsed ? 'center' : 'flex-start',
          '&.Mui-selected': {
            bgcolor: 'primary.main', color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            '& .MuiListItemIcon-root': { color: 'white' },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
          <NavIcon name={item.icon} />
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={label}
            sx={{ '& .MuiListItemText-primary': { fontSize: 13, fontWeight: isActive ? 600 : 400 } }}
          />
        )}
        {!collapsed && hasChildren && (isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />)}
      </ListItemButton>
    )

    return (
      <Box key={item.id}>
        {collapsed ? <Tooltip title={label} placement="right">{btn}</Tooltip> : btn}
        {hasChildren && !collapsed && (
          <Collapse in={isOpen}>
            <List disablePadding>
              {item.children!.map(c => renderItem(c, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  return <List disablePadding sx={{ pt: 1 }}>{items.map(i => renderItem(i))}</List>
}
