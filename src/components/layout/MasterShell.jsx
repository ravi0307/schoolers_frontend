import WebLayout from "../layout/WebLayout";

const NAV = [
  { to: "/master/schools", icon: "🏫", label: "Schools" },
  { to: "/master/system-health", icon: "🩺", label: "System Health" },
];

export default function MasterShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="MASTER ADMIN">
      {children}
    </WebLayout>
  );
}
