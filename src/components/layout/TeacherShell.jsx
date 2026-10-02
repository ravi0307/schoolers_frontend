import WebLayout from "../layout/WebLayout";
import { CalendarDays, ClipboardList, Image, Megaphone, Trophy, UserRoundCheck } from "lucide-react";

const NAV = [
  { to: "/teacher/dashboard", icon: ClipboardList, label: "Student List" },
  { to: "/teacher/attendance", icon: UserRoundCheck, label: "Attendance" },
  { to: "/teacher/marks", icon: Trophy, label: "Marks" },
  { to: "/teacher/timetable", icon: CalendarDays, label: "Timetable" },
  { to: "/teacher/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/teacher/gallery", icon: Image, label: "Gallery" },
];

export default function TeacherShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="TEACHER PORTAL">
      {children}
    </WebLayout>
  );
}