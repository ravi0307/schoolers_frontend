import WebLayout from "../layout/WebLayout";

const NAV = [
  { to: "/admin/dashboard", icon: "🏠", label: "Dashboard" },
  { to: "/admin/classes", icon: "📋", label: "Classes" },
  { to: "/admin/students", icon: "🧑‍🎓", label: "Students" },
  { to: "/admin/teachers", icon: "🧑‍🏫", label: "Teachers" },
  { to: "/admin/staff", icon: "👥", label: "Staff" },
  { to: "/admin/routes", icon: "🚌", label: "Routes" },
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
