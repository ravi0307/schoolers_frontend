import WebLayout from "./WebLayout";
import { Bus, CalendarDays, FileText, Megaphone } from "lucide-react";

const TABS = [
  { to: "/pilot/pickdrop", icon: Bus, label: "Pick & Drop" },
  { to: "/pilot/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/pilot/leave", icon: CalendarDays, label: "Leave" },
  { to: "/pilot/trips", icon: "Bus", label: "My Trips" },
  { to: "/pilot/report", icon: FileText, label: "My Report" },
];

export default function PilotShell({ children }) {
  return (
    <WebLayout navItems={TABS} portalLabel="PILOT PORTAL">
      {children}
    </WebLayout>
  );
}