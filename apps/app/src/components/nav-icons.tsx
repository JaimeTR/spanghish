import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  House,
  Languages,
  LayoutDashboard,
  Library,
  Presentation,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "@/lib/nav";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: GraduationCap,
  teachers: Presentation,
  languages: Languages,
  today: CalendarDays,
  groups: UsersRound,
  learning: BookOpen,
  schedule: CalendarClock,
  library: Library,
  overview: House,
};
