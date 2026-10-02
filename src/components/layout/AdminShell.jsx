import WebLayout from "../layout/WebLayout";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  House,
  Image,
  Megaphone,
  PartyPopper,
  Users,
  Wallet,
  Globe,
} from "lucide-react";

/*
 * Grouped by purpose and ordered by dependency within each group.
 *
 * "Day to day" sits above "Set up" because it is what an admin works in once
 * the school is running; "Set up" is the occasional structural work behind it.
 *
 * "Set up" is a genuine sequence - each step needs the one above it:
 *
 *   Staff      -> nothing. Creates the teachers that Classes and Timetable
 *                 assign, and the drivers Commute needs.
 *   Subjects   -> nothing. Names what the Timetable schedules.
 *   Classes    -> a staff member to be class teacher.
 *   Students   -> a class. Cannot be onboarded without one.
 *   Timetable  -> a class, plus subjects and teachers to fill the periods.
 *   Holidays   -> nothing. Dates are independent; the Timetable only reads
 *                 them to mark a column red.
 *
 * "Accounts and Reporting" sits below "Set up" because both are downstream of
 * a school having staff and students to bill: an empty salary or fee grid tells
 * you nothing until the people on it exist.
 *
 * That order holds inside the group regardless of where the group sits, and
 * "Public" is the outward-facing site, so it stays last.
 */
const NAV = [
  { to: "/admin/dashboard", icon: House, label: "Dashboard", group: "Overview" },

  { to: "/admin/routes", icon: Bus, label: "Commute", group: "Day to day" },
  { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast", group: "Day to day" },
  { to: "/admin/leave", icon: CalendarDays, label: "Leave Requests", group: "Day to day" },
  { to: "/admin/gallery", icon: Image, label: "Gallery", group: "Day to day" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications", group: "Day to day" },

  { to: "/admin/staff", icon: Users, label: "Staff", group: "Set up" },
  { to: "/admin/subjects", icon: BookOpen, label: "Subjects", group: "Set up" },
  { to: "/admin/classes", icon: ClipboardList, label: "Classes", group: "Set up" },
  { to: "/admin/students", icon: GraduationCap, label: "Students", group: "Set up" },
  { to: "/admin/timetable", icon: CalendarClock, label: "Manage Timetable", group: "Set up" },
  { to: "/admin/holidays", icon: PartyPopper, label: "Holidays", group: "Set up" },

  { to: "/admin/accounts", icon: Wallet, label: "Accounts", group: "Accounts and Reporting" },
  { to: "/admin/reports", icon: BarChart3, label: "Reporting", group: "Accounts and Reporting" },

  { to: "/admin/website", icon: Globe, label: "School Website", group: "Public" },
];

export default function AdminShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="ADMIN PORTAL">
      {children}
    </WebLayout>
  );
}
