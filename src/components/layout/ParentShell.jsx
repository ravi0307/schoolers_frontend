import WebLayout from "../layout/WebLayout";
import { Outlet } from "react-router-dom";
import { useParentContext } from "../../context/ParentContext";
import { Spinner } from "../ui/Primitives";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import styles from "./ParentShell.module.css";
import { Backpack, BarChart3, Bus, CalendarDays, CalendarRange, Check, History, House, Image, Trophy } from "lucide-react";

const TABS = [
  { to: "/parent/home", icon: House, label: "Home" },
  { to: "/parent/pickdrop", icon: Bus, label: "Pick & Drop" },
  { to: "/parent/trips", icon: History, label: "Trip History" },
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

  const childPicker =
    !loading && kids.length > 1 ? (
      <Card className={`card white ${styles.childPicker}`}>
        <label htmlFor="parent-child-select">Viewing</label>
        <select id="parent-child-select" value={selectedChildId || ""} onChange={(e) => setSelectedChildId(Number(e.target.value))}>
          {kids.map((k) => (
            <option key={k.student_id} value={k.student_id}>
              {k.name} · Class {k.class_id}
            </option>
          ))}
        </select>
      </Card>
    ) : null;

  const body =
    loading ? (
      <Spinner />
    ) : kids.length === 0 ? (
      <EmptyState>No children linked to this parent account yet.</EmptyState>
    ) : (
      <>
        {childPicker}
        {children ?? <Outlet />}
      </>
    );

  return (
    <WebLayout navItems={TABS} portalLabel="PARENT PORTAL">
      {body}
    </WebLayout>
  );
}
