import { useIsWide } from "../../hooks/useIsWide";
import MobileLayout from "./MobileLayout";
import WebLayout from "./WebLayout";

const TABS = [
  { to: "/pilot/pickdrop", icon: "🚌", label: "Pick & Drop" },
  { to: "/pilot/broadcast", icon: "📣", label: "Broadcast" },
  { to: "/pilot/leave", icon: "📅", label: "Leave" },
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