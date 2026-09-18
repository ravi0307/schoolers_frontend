import { useEffect, useState } from "react";
import MobileLayout from "./MobileLayout";
import WebLayout from "./WebLayout";

const TABS = [
  { to: "/pilot/pickdrop", icon: "🚌", label: "Pick & Drop" },
  { to: "/pilot/broadcast", icon: "📣", label: "Broadcast" },
  { to: "/pilot/leave", icon: "📅", label: "Leave" },
];

function useIsWide(breakpoint = 900) {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (event) => setIsWide(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isWide;
}

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