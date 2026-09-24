import WebLayout from "../layout/WebLayout";

const NAV = [
  { to: "/teacher/dashboard", icon: "📋", label: "Student List" },
  { to: "/teacher/attendance", icon: "✅", label: "Attendance" },
  { to: "/teacher/marks", icon: "🏆", label: "Marks" },
  { to: "/teacher/timetable", icon: "🗓️", label: "Timetable" },
  { to: "/teacher/broadcast", icon: "📣", label: "Broadcast" },
  { to: "/teacher/gallery", icon: "🖼️", label: "Gallery" },
];

export default function TeacherShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="TEACHER PORTAL">
      {children}
    </WebLayout>
  );
}