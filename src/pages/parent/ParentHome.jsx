import ParentShell from "../../components/layout/ParentShell";
import { useParentContext } from "../../context/ParentContext";
import { Pill, initials } from "../../components/ui/Primitives";
import { useNavigate } from "react-router-dom";

export default function ParentHome() {
  const { selectedChild } = useParentContext();
  const navigate = useNavigate();

  if (!selectedChild) return <ParentShell>{null}</ParentShell>;

  return (
    <ParentShell>
      <div className="scr-title">Good day 👋</div>
      <div className="scr-sub">Here's what's happening with {selectedChild.name.split(" ")[0]} today</div>

      <div className="card white" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar">{initials(selectedChild.name)}</div>
          <div>
            <b style={{ fontSize: 13.5 }}>{selectedChild.name}</b>
            <div style={{ marginTop: 4 }}>
              <Pill tone={selectedChild.present_today ? "ok" : "warn"}>
                {selectedChild.present_today ? "Present today" : "Marked absent"}
              </Pill>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Quick access</div>
      <div className="grid2">
        <button className="card" onClick={() => navigate("/parent/attendance")} style={{ textAlign: "left", cursor: "pointer" }}>
          <b style={{ fontSize: 12.5 }}>✅ Attendance</b>
        </button>
        <button className="card" onClick={() => navigate("/parent/marks")} style={{ textAlign: "left", cursor: "pointer" }}>
          <b style={{ fontSize: 12.5 }}>🏆 Report Card</b>
        </button>
        <button className="card" onClick={() => navigate("/parent/leave")} style={{ textAlign: "left", cursor: "pointer" }}>
          <b style={{ fontSize: 12.5 }}>📅 Leave Request</b>
        </button>
        <button className="card" onClick={() => navigate("/parent/barter")} style={{ textAlign: "left", cursor: "pointer" }}>
          <b style={{ fontSize: 12.5 }}>🎒 Barter</b>
        </button>
      </div>
    </ParentShell>
  );
}
