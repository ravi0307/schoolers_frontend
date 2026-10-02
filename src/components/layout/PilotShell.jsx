import { useIsWide } from "../../hooks/useIsWide";
import MobileLayout from "./MobileLayout";
import WebLayout from "./WebLayout";
import { Bus, CalendarDays, Megaphone } from "lucide-react";

const TABS = [
  { to: "/pilot/pickdrop", icon: Bus, label: "Pick & Drop" },
  { to: "/pilot/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/pilot/leave", icon: CalendarDays, label: "Leave" },
];

export default function PilotShell({ children }) {
  const isWide = useIsWide();
  if (isWide) {
    return (
      <WebLayout navItems={TABS} portalLabel="PILOT PORTAL">
        {children}
      </WebLayout>
    );
  }
  return <MobileLayout tabs={TABS}>{children}</MobileLayout>;
}