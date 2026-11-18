import {
  Atom,
  Box,
  Award,
  BookOpen,
  Cpu,
  Dna,
  FlaskConical,
  FolderOpen,
  Gauge,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  type LucideIcon,
  Microscope,
  Settings,
  Share2,
  Shield,
  Sparkles,
  TestTubes,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";

export interface NavItem {
  href: string;
  label: DictKey;
  icon: LucideIcon;
  admin?: boolean;
}

export const NAV_GROUPS: { title: { en: string; ar: string }; items: NavItem[] }[] = [
  {
    title: { en: "Labs", ar: "المعامل" },
    items: [
      { href: "/dashboard", label: "nav_dashboard", icon: LayoutDashboard },
      { href: "/lab/physics", label: "nav_physics", icon: Zap },
      { href: "/lab/chemistry", label: "nav_chemistry", icon: FlaskConical },
      { href: "/biology", label: "nav_biology", icon: Dna },
      { href: "/lab/free", label: "nav_free", icon: Sparkles },
      { href: "/experiments", label: "nav_experiments", icon: GraduationCap },
    ],
  },
  {
    title: { en: "Library", ar: "المكتبة العلمية" },
    items: [
      { href: "/library/equipment", label: "nav_equipment", icon: Microscope },
      { href: "/library/components", label: "nav_components", icon: Cpu },
      { href: "/library/substances", label: "nav_substances", icon: TestTubes },
      { href: "/periodic-table", label: "nav_periodic", icon: Atom },
    ],
  },
  {
    title: { en: "Progress", ar: "التقدم والمجتمع" },
    items: [
      { href: "/projects", label: "nav_projects", icon: FolderOpen },
      { href: "/shared", label: "nav_shared", icon: Share2 },
      { href: "/leaderboard", label: "nav_leaderboard", icon: Trophy },
      { href: "/achievements", label: "nav_achievements", icon: Award },
      { href: "/progress", label: "nav_progress", icon: Gauge },
    ],
  },
  {
    title: { en: "Account", ar: "الحساب" },
    items: [
      { href: "/profile", label: "nav_profile", icon: User },
      { href: "/settings", label: "nav_settings", icon: Settings },
      { href: "/help", label: "nav_help", icon: HelpCircle },
      { href: "/credits", label: "nav_credits", icon: Box },
      { href: "/admin", label: "nav_admin", icon: Shield, admin: true },
    ],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "nav_dashboard", icon: LayoutDashboard },
  { href: "/lab/physics", label: "nav_physics", icon: Zap },
  { href: "/lab/chemistry", label: "nav_chemistry", icon: FlaskConical },
  { href: "/experiments", label: "nav_experiments", icon: BookOpen },
];
