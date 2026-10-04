import WebLayout from "../layout/WebLayout";
import { CalendarDays, ClipboardList, FileText, Image, Megaphone, Trophy, UserRoundCheck } from "lucide-react";

const NAV = [
  { to: "/teacher/dashboard", icon: ClipboardList, label: "Student List" },
  { to: "/teacher/attendance", icon: UserRoundCheck, label: "Attendance" },
  { to: "/teacher/marks", icon: Trophy, label: "Marks" },
  { to: "/teacher/timetable", icon: CalendarDays, label: "Timetable" },
  { to: "/teacher/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/teacher/gallery", icon: Image, label: "Gallery" },
  { to: "/teacher/report", icon: FileText, label: "My Report" },
];

export default function TeacherShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="TEACHER PORTAL">
      {children}
    </WebLayout>
  );
}