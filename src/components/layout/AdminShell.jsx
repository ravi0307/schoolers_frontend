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

const NAV = [
  { to: "/admin/dashboard", icon: House, label: "Dashboard" },
  { to: "/admin/routes", icon: Bus, label: "Commute" },
  { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/admin/leave", icon: CalendarDays, label: "Leave Requests" },
  { to: "/admin/gallery", icon: Image, label: "Gallery" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/staff", icon: Users, label: "Staff" },
  { to: "/admin/subjects", icon: BookOpen, label: "Subjects" },
  { to: "/admin/classes", icon: ClipboardList, label: "Classes" },
  { to: "/admin/students", icon: GraduationCap, label: "Students" },
  { to: "/admin/timetable", icon: CalendarClock, label: "Manage Timetable" },
  { to: "/admin/holidays", icon: PartyPopper, label: "Holidays" },
  { to: "/admin/accounts", icon: Wallet, label: "Accounts" },
  { to: "/admin/reports", icon: BarChart3, label: "Reporting" },
  { to: "/admin/website", icon: Globe, label: "School Website" },
];

export default function AdminShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="ADMIN PORTAL">
      {children}
    </WebLayout>
  );
}
