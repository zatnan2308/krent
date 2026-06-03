import {
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  Home,
  Info,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquare,
  PanelsTopLeft,
  Plug,
  Search,
  Settings,
  Share2,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/constants/routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Навигация рабочего пространства dashboard. */
export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard.root, icon: LayoutDashboard },
  { label: "Home page", href: ROUTES.dashboard.home, icon: Home },
  { label: "Pages", href: ROUTES.dashboard.pages, icon: FileText },
  {
    label: "Navigation",
    href: ROUTES.dashboard.navigation,
    icon: PanelsTopLeft,
  },
  { label: "About page", href: ROUTES.dashboard.about, icon: Info },
  { label: "Properties", href: ROUTES.dashboard.properties, icon: Building2 },
  { label: "CRM", href: ROUTES.dashboard.crm, icon: Users },
  { label: "Clients", href: ROUTES.dashboard.clients, icon: UserCheck },
  { label: "Rentals", href: ROUTES.dashboard.rentals, icon: KeyRound },
  { label: "Bookings", href: ROUTES.dashboard.bookings, icon: CalendarCheck },
  { label: "Calendar", href: ROUTES.dashboard.calendar, icon: CalendarDays },
  { label: "Messages", href: ROUTES.dashboard.messages, icon: MessageSquare },
  { label: "Email", href: ROUTES.dashboard.email, icon: Mail },
  { label: "Marketing", href: ROUTES.dashboard.marketing, icon: Megaphone },
  { label: "SEO", href: ROUTES.dashboard.seo, icon: Search },
  { label: "Analytics", href: ROUTES.dashboard.analytics, icon: TrendingUp },
  { label: "Reports", href: ROUTES.dashboard.reports, icon: FileText },
  {
    label: "Integrations",
    href: ROUTES.dashboard.integrations,
    icon: Plug,
  },
  {
    label: "Agent Sync",
    href: ROUTES.dashboard.agentSync,
    icon: Share2,
  },
  { label: "Settings", href: ROUTES.dashboard.settings, icon: Settings },
];

/** Навигация раздела Super Admin. */
export const superAdminNav: NavItem[] = [
  { label: "Overview", href: ROUTES.superAdmin.root, icon: LayoutDashboard },
  {
    label: "Organizations",
    href: ROUTES.superAdmin.organizations,
    icon: Building,
  },
  { label: "Users", href: ROUTES.superAdmin.users, icon: Users },
  { label: "Licenses", href: ROUTES.superAdmin.licenses, icon: KeyRound },
  { label: "System health", href: ROUTES.superAdmin.health, icon: TrendingUp },
];
