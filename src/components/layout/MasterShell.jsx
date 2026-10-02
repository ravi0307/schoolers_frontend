import WebLayout from "../layout/WebLayout";
import { Activity, School } from "lucide-react";

const NAV = [
  { to: "/master/schools", icon: School, label: "Schools" },
  { to: "/master/system-health", icon: Activity, label: "System Health" },
];

export default function MasterShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="MASTER ADMIN">
      {children}
    </WebLayout>
  );
}
