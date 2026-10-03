import WebLayout from "../layout/WebLayout";
import { FileText, Image, Megaphone } from "lucide-react";

const NAV = [
  { to: "/staff/broadcast", icon: Megaphone, label: "Broadcast" },
  { to: "/staff/gallery", icon: Image, label: "Gallery" },
  { to: "/staff/report", icon: FileText, label: "My Report" },
];

export default function StaffShell({ children }) {
  return (
    <WebLayout navItems={NAV} portalLabel="STAFF PORTAL">
      {children}
    </WebLayout>
  );
}
