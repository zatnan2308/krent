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
  /** Право, необходимое чтобы видеть пункт (undefined — видно всем). */
  permission?: string;
}

/** Секция навигации с необязательным заголовком. */
export interface NavSection {
  /** Заголовок секции; null — без заголовка (Overview/Settings). */
  label: string | null;
  items: NavItem[];
}

/**
 * Навигация dashboard, сгруппированная по секциям. Права берутся ровно из
 * redirect-гейтов соответствующих страниц, чтобы видимость пункта совпадала с
 * реальной доступностью. Пункты без `permission` доступны всем (их страницы не
 * гейтятся).
 */
export const dashboardNavSections: NavSection[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: ROUTES.dashboard.root, icon: LayoutDashboard },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      {
        label: "CRM",
        href: ROUTES.dashboard.crm,
        icon: Users,
        permission: "crm.view",
      },
      {
        label: "Client portals",
        href: ROUTES.dashboard.clients,
        icon: UserCheck,
        permission: "crm.view",
      },
    ],
  },
  {
    label: "Properties & rentals",
    items: [
      {
        label: "Properties",
        href: ROUTES.dashboard.properties,
        icon: Building2,
      },
      {
        label: "Rentals",
        href: ROUTES.dashboard.rentals,
        icon: KeyRound,
        permission: "rentals.view",
      },
      {
        label: "Bookings",
        href: ROUTES.dashboard.bookings,
        icon: CalendarCheck,
        permission: "bookings.view",
      },
      {
        label: "Calendar",
        href: ROUTES.dashboard.calendar,
        icon: CalendarDays,
        permission: "calendar.view",
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        label: "Messages",
        href: ROUTES.dashboard.messages,
        icon: MessageSquare,
        permission: "crm.view",
      },
      {
        label: "Email",
        href: ROUTES.dashboard.email,
        icon: Mail,
        permission: "email.manage",
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Marketing",
        href: ROUTES.dashboard.marketing,
        icon: Megaphone,
        permission: "marketing.manage",
      },
      {
        label: "SEO",
        href: ROUTES.dashboard.seo,
        icon: Search,
        permission: "seo.manage",
      },
      {
        label: "Analytics",
        href: ROUTES.dashboard.analytics,
        icon: TrendingUp,
        permission: "analytics.view",
      },
      {
        label: "Reports",
        href: ROUTES.dashboard.reports,
        icon: FileText,
        permission: "analytics.view",
      },
      {
        label: "Integrations",
        href: ROUTES.dashboard.integrations,
        icon: Plug,
        permission: "analytics.view",
      },
      {
        label: "Agent Sync",
        href: ROUTES.dashboard.agentSync,
        icon: Share2,
        permission: "analytics.view",
      },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Home page", href: ROUTES.dashboard.home, icon: Home, permission: "branding.manage" },
      { label: "Pages", href: ROUTES.dashboard.pages, icon: FileText },
      {
        label: "Navigation",
        href: ROUTES.dashboard.navigation,
        icon: PanelsTopLeft,
      },
      {
        label: "About page",
        href: ROUTES.dashboard.about,
        icon: Info,
        permission: "organization.view",
      },
    ],
  },
  {
    label: null,
    items: [
      {
        label: "Settings",
        href: ROUTES.dashboard.settings,
        icon: Settings,
        permission: "organization.view",
      },
    ],
  },
];

/** Навигация раздела Super Admin (плоская). */
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
