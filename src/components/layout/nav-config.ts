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
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Ключ ярлыка навигации админки в словаре (dict.adminNav). */
export type AdminNavKey = keyof Dictionary["adminNav"];

export interface NavItem {
  /** Ключ перевода ярлыка — dict.adminNav[labelKey]. */
  labelKey: AdminNavKey;
  href: string;
  icon: LucideIcon;
  /** Право, необходимое чтобы видеть пункт (undefined — видно всем). */
  permission?: string;
}

/** Секция навигации с необязательным заголовком. */
export interface NavSection {
  /** Ключ заголовка секции; null — без заголовка (Overview/Settings). */
  labelKey: AdminNavKey | null;
  items: NavItem[];
}

/**
 * Навигация dashboard, сгруппированная по секциям. Права берутся ровно из
 * redirect-гейтов соответствующих страниц, чтобы видимость пункта совпадала с
 * реальной доступностью. Пункты без `permission` доступны всем (их страницы не
 * гейтятся). Ярлыки локализуются через dict.adminNav[labelKey].
 */
export const dashboardNavSections: NavSection[] = [
  {
    labelKey: null,
    items: [
      {
        labelKey: "dashboard",
        href: ROUTES.dashboard.root,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "secSalesCrm",
    items: [
      {
        labelKey: "crm",
        href: ROUTES.dashboard.crm,
        icon: Users,
        permission: "crm.view",
      },
      {
        labelKey: "clientPortals",
        href: ROUTES.dashboard.clients,
        icon: UserCheck,
        permission: "crm.view",
      },
    ],
  },
  {
    labelKey: "secProperties",
    items: [
      {
        labelKey: "properties",
        href: ROUTES.dashboard.properties,
        icon: Building2,
      },
      {
        labelKey: "rentals",
        href: ROUTES.dashboard.rentals,
        icon: KeyRound,
        permission: "rentals.view",
      },
      {
        labelKey: "bookings",
        href: ROUTES.dashboard.bookings,
        icon: CalendarCheck,
        permission: "bookings.view",
      },
      {
        labelKey: "calendar",
        href: ROUTES.dashboard.calendar,
        icon: CalendarDays,
        permission: "calendar.view",
      },
    ],
  },
  {
    labelKey: "secCommunication",
    items: [
      {
        labelKey: "messages",
        href: ROUTES.dashboard.messages,
        icon: MessageSquare,
        permission: "crm.view",
      },
      {
        labelKey: "email",
        href: ROUTES.dashboard.email,
        icon: Mail,
        permission: "email.manage",
      },
    ],
  },
  {
    labelKey: "secGrowth",
    items: [
      {
        labelKey: "marketing",
        href: ROUTES.dashboard.marketing,
        icon: Megaphone,
        permission: "marketing.manage",
      },
      {
        labelKey: "seo",
        href: ROUTES.dashboard.seo,
        icon: Search,
        permission: "seo.manage",
      },
      {
        labelKey: "analytics",
        href: ROUTES.dashboard.analytics,
        icon: TrendingUp,
        permission: "analytics.view",
      },
      {
        labelKey: "reports",
        href: ROUTES.dashboard.reports,
        icon: FileText,
        permission: "analytics.view",
      },
      {
        labelKey: "integrations",
        href: ROUTES.dashboard.integrations,
        icon: Plug,
        permission: "analytics.view",
      },
      {
        labelKey: "agentSync",
        href: ROUTES.dashboard.agentSync,
        icon: Share2,
        permission: "analytics.view",
      },
    ],
  },
  {
    labelKey: "secWebsite",
    items: [
      {
        labelKey: "homePage",
        href: ROUTES.dashboard.home,
        icon: Home,
        permission: "branding.manage",
      },
      {
        labelKey: "pages",
        href: ROUTES.dashboard.pages,
        icon: FileText,
        permission: "pages.manage",
      },
      {
        labelKey: "navigation",
        href: ROUTES.dashboard.navigation,
        icon: PanelsTopLeft,
        permission: "navigation.manage",
      },
      {
        labelKey: "aboutPage",
        href: ROUTES.dashboard.about,
        icon: Info,
        permission: "branding.manage",
      },
    ],
  },
  {
    labelKey: null,
    items: [
      {
        labelKey: "settings",
        href: ROUTES.dashboard.settings,
        icon: Settings,
        permission: "organization.view",
      },
    ],
  },
];

/** Навигация раздела Super Admin (плоская). */
export const superAdminNav: NavItem[] = [
  { labelKey: "overview", href: ROUTES.superAdmin.root, icon: LayoutDashboard },
  {
    labelKey: "organizations",
    href: ROUTES.superAdmin.organizations,
    icon: Building,
  },
  { labelKey: "users", href: ROUTES.superAdmin.users, icon: Users },
  { labelKey: "licenses", href: ROUTES.superAdmin.licenses, icon: KeyRound },
  {
    labelKey: "systemHealth",
    href: ROUTES.superAdmin.health,
    icon: TrendingUp,
  },
];
