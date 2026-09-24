import { useMemo } from "react";
import ParentShell from "../../components/layout/ParentShell";
import BroadcastFeed from "../../components/ui/BroadcastFeed";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import { Pill, initials, Spinner, Empty } from "../../components/ui/Primitives";
import { useNavigate } from "react-router-dom";
import { TIMETABLE_DAYS as DAYS, getEntryTime } from "../../utils/timetableFlow";

export default function ParentHome() {
  const { selectedChild } = useParentContext();
  const navigate = useNavigate();

  const { data: broadcasts, loading, error } = useApi(() => communicationApi.listBroadcasts(), []);

  const { data: timetable, loading: ttLoading } = useApi(
    () => (selectedChild ? timetableApi.classTimetable(selectedChild.class_id) : Promise.resolve([])),
    [selectedChild?.class_id]
  );
  const { data: subjects } = useApi(() => academicsApi.listSubjects(), []);
  const { data: periods } = useApi(() => academicsApi.listPeriods(), []);

  const subjectNames = useMemo(
    () => new Map((subjects || []).map((item) => [String(item.subject_id), item.name])),
    [subjects]
  );
  const periodById = useMemo(
    () => new Map((periods || []).map((item) => [String(item.period_id), item])),
    [periods]
  );
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });

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
        <button className="card" onClick={() => navigate("/parent/pickdrop")} style={{ textAlign: "left", cursor: "pointer" }}>
          <b style={{ fontSize: 12.5 }}>🚌 Pick &amp; Drop</b>
        </button>
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

      <div className="section-label">This week's timetable</div>
      {ttLoading && <Spinner />}
      {!ttLoading &&
        (timetable && timetable.length ? (
          <div className="card white" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {DAYS.map((day) => (
                    <th key={day} style={day === today ? { color: "var(--chalk-green-dark)" } : undefined}>
                      {day}
                      {day === today ? " · today" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {DAYS.map((day) => (
                    <td key={day} style={{ verticalAlign: "top" }}>
                      {timetable
                        .filter((entry) => entry.day_of_week === day)
                        .map((entry) => {
                          const timeLabel = getEntryTime(entry, periodById);
                          return (
                            <div
                              key={entry.entry_id}
                              className="pill"
                              style={{ display: "block", marginBottom: 4, background: "var(--paper)" }}
                            >
                              <div style={{ fontWeight: 700 }}>
                                {entry.subject_id
                                  ? subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`
                                  : "Unassigned"}
                              </div>
                              {timeLabel ? <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{timeLabel}</div> : null}
                            </div>
                          );
                        })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <Empty>No timetable has been published for this class yet.</Empty>
          </div>
        ))}

      <div className="section-label">Announcements</div>
      <BroadcastFeed
        data={broadcasts}
        loading={loading}
        error={error}
        limit={8}
        empty="No announcements for your children yet."
      />
    </ParentShell>
  );
}
