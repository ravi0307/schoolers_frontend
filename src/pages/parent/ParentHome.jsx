import { useMemo } from "react";
import ParentShell from "../../components/layout/ParentShell";
import BroadcastFeed from "../../components/ui/BroadcastFeed";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as communicationApi from "../../api/communication";
import * as academicsApi from "../../api/academics";
import * as timetableApi from "../../api/timetable";
import * as attendanceApi from "../../api/attendance";
import * as marksApi from "../../api/marks";
import * as barterApi from "../../api/barter";
import * as leaveApi from "../../api/leave";
import * as transportApi from "../../api/transport";
import { Pill, initials, Spinner, Empty } from "../../components/ui/Primitives";
import { useNavigate } from "react-router-dom";
import { TIMETABLE_DAYS as DAYS, getEntryTime } from "../../utils/timetableFlow";

const LOADING = "Loading…";
const PICKDROP_LABEL = {
  pending: "Pickup pending",
  picked: "Picked up",
  dropped: "Dropped",
  not_assigned: "No route assigned yet",
};

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

  const { data: attendance, loading: attLoading } = useApi(
    () => (selectedChild ? attendanceApi.getAttendance(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  const { data: marks, loading: marksLoading } = useApi(
    () => (selectedChild ? marksApi.studentMarks(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  const { data: barter, loading: barterLoading } = useApi(() => barterApi.listBarter(), []);
  const { data: leaves, loading: leaveLoading } = useApi(() => leaveApi.listMine(), []);
  const { data: pickdrop, loading: pdLoading } = useApi(() => transportApi.getMyPickdropStatus(), []);

  const attendanceStats = useMemo(() => {
    const rows = attendance || [];
    return {
      present: rows.filter((a) => a.status === "Present").length,
      absent: rows.filter((a) => a.status === "Absent").length,
      total: rows.length,
    };
  }, [attendance]);

  const marksSummary = useMemo(() => {
    const rows = marks || [];
    if (!rows.length) return "No marks yet";
    const terms = [...new Set(rows.map((m) => m.term))].sort();
    const latestRows = rows.filter((m) => m.term === terms[terms.length - 1]);
    const avg = Math.round(latestRows.reduce((sum, m) => sum + m.score, 0) / latestRows.length);
    return `Latest ${avg}/100 avg · ${latestRows.length} subjects`;
  }, [marks]);

  const leaveStats = useMemo(() => {
    const rows = (leaves || []).filter((l) => l.requester_name === selectedChild?.name);
    return { pending: rows.filter((l) => l.status === "Pending").length, total: rows.length };
  }, [leaves, selectedChild?.name]);

  const pickdropRow = pickdrop && selectedChild ? pickdrop.find((r) => r.student_id === selectedChild.student_id) : null;

  const attendanceText = attLoading
    ? LOADING
    : attendanceStats.total === 0
      ? "No attendance history"
      : `${attendanceStats.present}/${attendanceStats.total} present`;
  const marksText = marksLoading ? LOADING : marksSummary;
  const barterText = barterLoading ? LOADING : `${(barter || []).length} live listing${(barter || []).length === 1 ? "" : "s"}`;
  const leaveText = leaveLoading
    ? LOADING
    : leaveStats.pending > 0
      ? `${leaveStats.pending} pending request${leaveStats.pending === 1 ? "" : "s"}`
      : leaveStats.total > 0
        ? `${leaveStats.total} request${leaveStats.total === 1 ? "" : "s"}`
        : "No requests yet";
  const pickdropText = pdLoading
    ? LOADING
    : !pickdropRow
      ? "Not linked to a route"
      : PICKDROP_LABEL[pickdropRow.status] || pickdropRow.status;

  const quickLinks = [
    { to: "/parent/pickdrop", icon: "🚌", title: "Pick & Drop", summary: pickdropText },
    { to: "/parent/attendance", icon: "✅", title: "Attendance", summary: attendanceText },
    { to: "/parent/marks", icon: "🏆", title: "Report Card", summary: marksText },
    { to: "/parent/leave", icon: "📅", title: "Leave Request", summary: leaveText },
    { to: "/parent/barter", icon: "🎒", title: "Barter", summary: barterText },
  ];

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
        {quickLinks.map((q) => (
          <button key={q.to} className="card" onClick={() => navigate(q.to)} style={{ textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>
              {q.icon} {q.title}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 6 }}>{q.summary}</div>
          </button>
        ))}
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
