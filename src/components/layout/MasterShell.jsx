import WebLayout from "../layout/WebLayout";
import { Activity, LifeBuoy, School } from "lucide-react";

const NAV = [
  { to: "/master/schools", icon: School, label: "Schools" },
  { to: "/master/system-health", icon: Activity, label: "System Health" },
  { to: "/master/support", icon: LifeBuoy, label: "Support Inbox" },
];

export default function MasterShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="MASTER ADMIN">
      {children}
    </WebLayout>
  );
}
