import WebLayout from "../layout/WebLayout";

const NAV = [
  { to: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
  { to: "/admin/classes", icon: "📋", label: "Classes" },
  { to: "/admin/timetable", icon: "🗓️", label: "Manage Timetable" },
  { to: "/admin/album", icon: "🖼️", label: "School Album" },
  { to: "/admin/students", icon: "🧑‍🎓", label: "Students" },
  { to: "/admin/staff", icon: "👥", label: "Staff" },
  { to: "/admin/routes", icon: "🚌", label: "Commute" },
  { to: "/admin/leave", icon: "📅", label: "Leave Requests" },
  { to: "/admin/website", icon: "🌐", label: "School Website" },
  { to: "/admin/notifications", icon: "🔔", label: "Notifications" },
];

export default function AdminShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="ADMIN PORTAL">
      {children}
    </WebLayout>
  );
}
