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
import * as galleryApi from "../../api/gallery";
import * as leaveApi from "../../api/leave";
import * as transportApi from "../../api/transport";
import { Pill, initials, Spinner, Empty } from "../../components/ui/Primitives";
import { useNavigate } from "react-router-dom";
import { resolveMediaUrl } from "../../api/client";
import { TIMETABLE_DAYS as DAYS, toTimeInput, displayTime } from "../../utils/timetableFlow";

const LOADING = "Loading…";
function GalleryCard({ title, summary, items, onNavigate }) {
  return (
    <button className="card" onClick={onNavigate} style={{ textAlign: "left", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 12.5 }}>{title}</b>
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Open →</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--chalk-green-dark)", marginTop: 6 }}>{summary}</div>
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
          {items.map((item) =>
            item.media_kind === "video" ? (
              <div
                key={item.media_id}
                style={{
                  width: 56,
                  height: 48,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--ruled-blue-light)",
                  borderRadius: 8,
                  fontSize: 18,
                }}
              >
                🎬
              </div>
            ) : (
              <img
                key={item.media_id}
                src={resolveMediaUrl(item.file_url)}
                alt={item.title}
                loading="lazy"
                style={{ width: 56, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
              />
            )
          )}
        </div>
      )}
    </button>
  );
}

const PICKDROP_LABEL = {
  pending: "Pickup pending",
  picked: "Picked up",
  dropped: "Dropped",
  not_assigned: "No route assigned yet",
};

// Resolve a timetable entry's start/end time to normalized "HH:MM" keys for the
// weekly summary (admin-portal convention): new entries carry SQL times that
// may include seconds, legacy entries reference a period whose period_time
// holds the schedule. Both are normalized with toTimeInput so they dedupe.
function summaryEntryTimes(entry, periodById) {
  if (entry.period_start_time && entry.period_end_time) {
    return [toTimeInput(entry.period_start_time), toTimeInput(entry.period_end_time)];
  }
  const period = periodById.get(String(entry.period_id));
  if (period?.period_time) {
    const [start, end] = period.period_time.split(" - ");
    return [toTimeInput(start), toTimeInput(end)];
  }
  return [null, null];
}

const TONE_COLOR = {
  ok: "var(--ok-green)",
  warn: "var(--red-pen)",
  mute: "var(--ink-soft)",
};

function QuickCard({ icon, title, summary, rows, onNavigate }) {
  return (
    <button className="card" onClick={onNavigate} style={{ textAlign: "left", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 12.5 }}>
          {icon} {title}
        </b>
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Open →</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--chalk-green-dark)", marginTop: 6 }}>{summary}</div>
      {rows && rows.length > 0 && (
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid var(--line)",
            paddingTop: 4,
            maxHeight: 150,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 2 }}>Recent</div>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                padding: "3px 0",
                fontSize: 11,
                borderBottom: i < rows.length - 1 ? "1px dotted var(--line)" : undefined,
              }}
            >
              <span style={{ color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label}
              </span>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: TONE_COLOR[row.tone] || "var(--ink)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

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
  const timeSlots = useMemo(
    () => [...new Set((timetable || []).map((e) => summaryEntryTimes(e, periodById)[0]).filter(Boolean))].sort(),
    [timetable, periodById]
  );
  const ttEntryMap = useMemo(() => {
    const map = new Map();
    (timetable || []).forEach((entry) => {
      const [start] = summaryEntryTimes(entry, periodById);
      if (start) map.set(`${entry.day_of_week}|${start}`, entry);
    });
    return map;
  }, [timetable, periodById]);
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });

  const { data: attendance, loading: attLoading } = useApi(
    () => (selectedChild ? attendanceApi.getAttendance(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  const { data: marks, loading: marksLoading } = useApi(
    () => (selectedChild ? marksApi.studentMarks(selectedChild.student_id) : Promise.resolve([])),
    [selectedChild?.student_id]
  );
  const { data: gallery, loading: galleryLoading } = useApi(() => galleryApi.listGallery(), []);
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

  const childLeaves = useMemo(
    () => (leaves || []).filter((l) => l.requester_name === selectedChild?.name),
    [leaves, selectedChild?.name]
  );
  const leavePending = childLeaves.filter((l) => l.status === "Pending").length;

  const pickdropRow = pickdrop && selectedChild ? pickdrop.find((r) => r.student_id === selectedChild.student_id) : null;

  const attendanceHistory = [...(attendance || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 100)
    .map((a) => ({ label: a.date, value: a.status, tone: a.status === "Present" ? "ok" : "warn" }));

  const marksHistory = [...(marks || [])]
    .sort((a, b) => b.term.localeCompare(a.term))
    .slice(0, 100)
    .map((m) => ({
      label: subjectNames.get(String(m.subject_id)) || `Subject #${m.subject_id}`,
      value: `${m.score}/100`,
      tone: m.score >= 75 ? "ok" : m.score >= 50 ? "mute" : "warn",
    }));

  const leaveHistory = childLeaves.slice(0, 100).map((l) => ({
    label: `${l.from_date} → ${l.to_date}`,
    value: l.status,
    tone: l.status === "Approved" ? "ok" : l.status === "Rejected" ? "warn" : "mute",
  }));

  const galleryItems = (gallery || []).filter((i) => i.file_url);
  const galleryThumbs = galleryItems.slice(0, 4);
  const galleryText = galleryLoading
    ? LOADING
    : galleryItems.length === 0
      ? "No photos yet"
      : `${galleryItems.length} photo${galleryItems.length === 1 ? "" : "s"} & video${galleryItems.length === 1 ? "" : "s"}`;

  const pickdropHistory = (pickdrop || [])
    .filter((r) => r.student_id !== selectedChild?.student_id)
    .slice(0, 100)
    .map((r) => ({
      label: r.student_name,
      value: PICKDROP_LABEL[r.status] || r.status,
      tone: r.status === "picked" ? "ok" : r.status === "dropped" ? "mute" : r.status === "pending" ? "warn" : "mute",
    }));

  const attendanceText = attLoading
    ? LOADING
    : attendanceStats.total === 0
      ? "No attendance history"
      : `${attendanceStats.present}/${attendanceStats.total} present`;
  const marksText = marksLoading ? LOADING : marksSummary;
  const leaveText = leaveLoading
    ? LOADING
    : leavePending > 0
      ? `${leavePending} pending request${leavePending === 1 ? "" : "s"}`
      : childLeaves.length > 0
        ? `${childLeaves.length} request${childLeaves.length === 1 ? "" : "s"}`
        : "No requests yet";
  const pickdropText = pdLoading
    ? LOADING
    : !pickdropRow
      ? "Not linked to a route"
      : PICKDROP_LABEL[pickdropRow.status] || pickdropRow.status;

  const quickLinks = [
    {
      to: "/parent/pickdrop",
      icon: "🚌",
      title: "Pick & Drop",
      summary: pickdropText,
      rows: pdLoading ? [] : pickdropHistory,
    },
    {
      to: "/parent/attendance",
      icon: "✅",
      title: "Attendance",
      summary: attendanceText,
      rows: attLoading ? [] : attendanceHistory,
    },
    {
      to: "/parent/marks",
      icon: "🏆",
      title: "Report Card",
      summary: marksText,
      rows: marksLoading ? [] : marksHistory,
    },
    {
      to: "/parent/leave",
      icon: "📅",
      title: "Leave Request",
      summary: leaveText,
      rows: leaveLoading ? [] : leaveHistory,
    },
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
          <QuickCard
            key={q.to}
            icon={q.icon}
            title={q.title}
            summary={q.summary}
            rows={q.rows}
            onNavigate={() => navigate(q.to)}
          />
        ))}
        <div className="card">
          <b style={{ fontSize: 12.5 }}>📢 Announcements</b>
          <div style={{ marginTop: 4, maxHeight: 150, overflowY: "auto" }}>
            <BroadcastFeed
              data={broadcasts}
              loading={loading}
              error={error}
              limit={12}
              bare
              empty="No announcements for your children yet."
            />
          </div>
        </div>
        <GalleryCard
          title="🖼️ Gallery"
          summary={galleryText}
          items={galleryLoading ? [] : galleryThumbs}
          onNavigate={() => navigate("/parent/gallery")}
        />
      </div>

      <div className="section-label">This week's timetable</div>
      <div className="grid2">
        {ttLoading && <Spinner />}
        {!ttLoading &&
          (timetable && timetable.length ? (
            <div className="card white timetable-weekly-summary-card">
              <span className="timetable-weekly-summary-title">Weekly summary</span>
              <table className="timetable-preview-table">
                <thead>
                  <tr>
                    <th className="time-col-header">Time</th>
                    {DAYS.map((day) => (
                      <th key={day} style={day === today ? { color: "var(--chalk-green-dark)" } : undefined}>
                        {day}
                        {day === today ? " · today" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((start) => (
                    <tr key={start}>
                      <td className="time-cell">{displayTime(start)}</td>
                      {DAYS.map((day) => {
                        const entry = ttEntryMap.get(`${day}|${start}`);
                        return (
                          <td key={day} className={entry ? "active-cell" : ""}>
                            {entry
                              ? subjectNames.get(String(entry.subject_id)) || `Subject #${entry.subject_id}`
                              : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card">
              <Empty>No timetable has been published for this class yet.</Empty>
            </div>
          ))}
        <div />
      </div>
    </ParentShell>
  );
}
