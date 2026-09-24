import WebLayout from "../layout/WebLayout";
import MobileLayout from "../layout/MobileLayout";
import { useParentContext } from "../../context/ParentContext";
import { useIsWide } from "../../hooks/useIsWide";
import { Spinner } from "../ui/Primitives";

const TABS = [
  { to: "/parent/home", icon: "🏠", label: "Home" },
  { to: "/parent/pickdrop", icon: "🚌", label: "Pick & Drop" },
  { to: "/parent/attendance", icon: "✅", label: "Attendance" },
  { to: "/parent/marks", icon: "🏆", label: "Marks" },
  { to: "/parent/gallery", icon: "🖼️", label: "Gallery" },
  { to: "/parent/leave", icon: "📅", label: "Leave" },
  { to: "/parent/barter", icon: "🎒", label: "Barter" },
];

export default function ParentShell({ children }) {
  const { kids, selectedChildId, setSelectedChildId, loading } = useParentContext();
  const isWide = useIsWide();

  const childPicker =
    !loading && kids.length > 1 ? (
      <div className="card white" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>Viewing</span>
        <select value={selectedChildId || ""} onChange={(e) => setSelectedChildId(Number(e.target.value))} style={{ flex: 1 }}>
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