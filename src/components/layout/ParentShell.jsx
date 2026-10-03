import WebLayout from "../layout/WebLayout";
import MobileLayout from "../layout/MobileLayout";
import { useParentContext } from "../../context/ParentContext";
import { useIsWide } from "../../hooks/useIsWide";
import { Spinner } from "../ui/Primitives";
import { Backpack, BarChart3, Bus, CalendarDays, CalendarRange, Check, House, Image, Trophy } from "lucide-react";

const TABS = [
  { to: "/parent/home", icon: House, label: "Home" },
  { to: "/parent/pickdrop", icon: Bus, label: "Pick & Drop" },
  { to: "/parent/attendance", icon: Check, label: "Attendance" },
  { to: "/parent/timetable", icon: CalendarRange, label: "Timetable" },
  { to: "/parent/marks", icon: Trophy, label: "Marks" },
  { to: "/parent/report", icon: BarChart3, label: "My Report" },
  { to: "/parent/gallery", icon: Image, label: "Gallery" },
  { to: "/parent/leave", icon: CalendarDays, label: "Leave" },
  { to: "/parent/barter", icon: Backpack, label: "Barter" },
];

export default function ParentShell({ children }) {
  const { kids, selectedChildId, setSelectedChildId, loading } = useParentContext();
  const isWide = useIsWide();

  const childPicker =
    !loading && kids.length > 1 ? (
      <div className="card white parent-child-picker">
        <span>Viewing</span>
        <select value={selectedChildId || ""} onChange={(e) => setSelectedChildId(Number(e.target.value))}>
          {kids.map((k) => (
            <option key={k.student_id} value={k.student_id}>
              {k.name} · Class {k.class_id}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const body =
    loading ? (
      <Spinner />
    ) : kids.length === 0 ? (
      <div className="empty">No children linked to this parent account yet.</div>
    ) : (
      <>
        {childPicker}
        {children}
      </>
    );

  if (isWide) {
    return (
      <WebLayout navItems={TABS} portalLabel="PARENT PORTAL">
        {body}
      </WebLayout>
    );
  }
  return <MobileLayout tabs={TABS}>{body}</MobileLayout>;
}
