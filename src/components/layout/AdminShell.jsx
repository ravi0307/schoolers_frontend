import WebLayout from "../layout/WebLayout";
import { useFeatures } from "../../context/FeatureContext";
import { filterNavByFeatures } from "../../features/registry";
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
  LibraryBig,
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
  {
    label: "Academics",
    icon: LibraryBig,
    items: [
      { to: "/admin/academic-calendar", icon: CalendarDays, label: "Academic Calendar" },
      { to: "/admin/exam-settings", icon: BookOpen, label: "Exam Settings" },
      { to: "/admin/examinations", icon: ClipboardList, label: "Examinations" },
      { to: "/admin/marks-entry", icon: GraduationCap, label: "Marks Entry" },
      { to: "/admin/exam-results", icon: BarChart3, label: "Exam Results" },
      { to: "/admin/promotion", icon: Users, label: "Promotion" },
    ],
  },
  { to: "/admin/accounts", icon: Wallet, label: "Accounts" },
  { to: "/admin/reports", icon: BarChart3, label: "Reporting" },
  { to: "/admin/build-your-site", icon: PanelsTopLeft, label: "Build Your Site" },
];

export default function AdminShell({ children }) {
  const { features } = useFeatures();
  // Only the features enabled for this admin's school appear in the nav;
  // groups that end up empty are dropped entirely.
  const navItems = filterNavByFeatures(NAV, features);
  return (
    <WebLayout navItems={navItems} portalLabel="ADMIN PORTAL">
      {children}
    </WebLayout>
  );
}
