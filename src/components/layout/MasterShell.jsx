import WebLayout from "../layout/WebLayout";
import { useAuth } from "../../context/AuthContext";
import { Activity, LifeBuoy, School, Users } from "lucide-react";

const BASE_NAV = [
  { to: "/master/schools", icon: School, label: "Schools" },
  { to: "/master/system-health", icon: Activity, label: "System Health" },
  { to: "/master/support", icon: LifeBuoy, label: "Support Inbox" },
];

export default function MasterShell({ children }) {
  const { user } = useAuth();
  // Accounts is Master-only: a Sub-Master is never even offered the
  // privileged-account roster (the API refuses it regardless of the link).
  const navItems =
    user?.role === "master"
      ? [
          BASE_NAV[0],
          { to: "/master/accounts", icon: Users, label: "Accounts" },
          ...BASE_NAV.slice(1),
        ]
      : BASE_NAV;

  return (
    <WebLayout navItems={navItems} portalLabel="MASTER ADMIN">
      {children}
    </WebLayout>
  );
}
