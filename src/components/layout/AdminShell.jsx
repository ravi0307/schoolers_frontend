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
  History,
  House,
  Image,
  LifeBuoy,
  Megaphone,
  PartyPopper,
  Users,
  Wallet,
  PanelsTopLeft,
} from "lucide-react";

const NAV = [
  { to: "/admin/dashboard", icon: House, label: "Dashboard" },
  { to: "/admin/routes", icon: Bus, label: "Commute" },
  { to: "/admin/trips", icon: History, label: "Trip History" },
  { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/admin/leave", icon: CalendarDays, label: "Leave Requests" },
  { to: "/admin/gallery", icon: Image, label: "Gallery" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/support", icon: LifeBuoy, label: "Contact Support" },
  { to: "/admin/staff", icon: Users, label: "Staff" },
  { to: "/admin/subjects", icon: BookOpen, label: "Subjects" },
  { to: "/admin/classes", icon: ClipboardList, label: "Classes" },
  { to: "/admin/students", icon: GraduationCap, label: "Students" },
  { to: "/admin/timetable", icon: CalendarClock, label: "Manage Timetable" },
  { to: "/admin/holidays", icon: PartyPopper, label: "Holidays" },
  { to: "/admin/accounts", icon: Wallet, label: "Accounts" },
  { to: "/admin/reports", icon: BarChart3, label: "Reporting" },
  { to: "/admin/my_website2", icon: PanelsTopLeft, label: "My_website2" },
];

export default function AdminShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="ADMIN PORTAL">
      {children}
    </WebLayout>
  );
}
