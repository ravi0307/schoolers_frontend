import { useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import { ArrowUpRight, Bus, CalendarDays, Check, Image as ImageIcon, Megaphone, Trophy, Video } from "lucide-react";
import styles from "./ParentHome.module.css";
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
import { Pill, initials, Spinner } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { resolveMediaUrl } from "../../api/client";
import { TIMETABLE_DAYS as DAYS, toTimeInput, displayTime } from "../../utils/timetableFlow";

const LOADING = "Loading…";
function GalleryCard({ title, summary, items, onNavigate, className }) {
  return (
    <Card
      as="button"
      type="button"
      className={`${styles.summaryCard} ${className || ""}`}
      onClick={onNavigate}
    >
      <div className={styles.summaryHead}>
        <b className={styles.summaryTitle}>{title}</b>
        <span className={styles.openLink}>Open <ArrowUpRight aria-hidden="true" /></span>
      </div>
      <div className={styles.summaryText}>{summary}</div>
      {items.length > 0 && (
        <div className={styles.previewList}>
          {items.map((item) => (
            <div key={item.media_id} className={styles.previewItem}>
              {item.media_kind === "video" ? (
                <div className={styles.previewPlaceholder}>
                  <Video aria-label="Video" />
                </div>
              ) : (
                <img
                  src={resolveMediaUrl(item.file_url)}
                  alt={item.title}
                  loading="lazy"
                  className={styles.previewImage}
                />
              )}
              <span className={styles.previewTitle}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
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

function QuickCard({ icon: Icon, title, summary, rows, onNavigate }) {
  return (
    <Card as="button" type="button" className={styles.summaryCard} onClick={onNavigate}>
      <div className={styles.summaryHead}>
        <b className={styles.summaryTitle}>
          <Icon aria-hidden="true" className={styles.summaryIcon} /> {title}
        </b>
        <span className={styles.openLink}>Open <ArrowUpRight aria-hidden="true" /></span>
      </div>
      <div className={styles.summaryText}>{summary}</div>
      {rows && rows.length > 0 && (
        <div className={styles.historyList}>
          <div className={styles.historyLabel}>Recent</div>
          {rows.map((row, i) => (
            <div key={i} className={styles.historyRow}>
              <span className={styles.historyName}>
                {row.label}
              </span>
              <span className={`${styles.historyValue} ${styles[`tone${row.tone[0].toUpperCase()}${row.tone.slice(1)}`] || ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
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

  // "Route 1 / Picked up" alone tells a parent nothing about where or when, so
  // pair the status with the next boarding stop and its time. The stop schedule
  // rides along on the snapshot, so this needs no extra request.
  const pickdropStopText = (row) => {
    const stops = row?.stops || [];
    if (!stops.length) return "";
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const minutes = (hhmm) => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(":").map(Number);
      return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
    };
    // Stops are in boarding order; the first one still ahead of the clock is next.
    const next = stops.find((s) => {
      const t = minutes(s.pickup_time);
      return t == null || t > nowMin;
    });
    const stop = next || stops[stops.length - 1];
    const when = next ? `next ${stop.pickup_time || "—"}` : `last pickup ${stop.pickup_time || "—"}`;
    return `${stop.stop_name} · ${when}`;
  };

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
  const galleryText = galleryLoading
    ? LOADING
    : galleryItems.length === 0
      ? "No photos yet"
      : `${galleryItems.length} photo${galleryItems.length === 1 ? "" : "s"} & video${galleryItems.length === 1 ? "" : "s"}`;

  const pickdropHistory = (pickdrop || [])
    .filter((r) => r.student_id !== selectedChild?.student_id)
    .slice(0, 100)
    .map((r) => {
      const where = pickdropStopText(r);
      return {
        label: r.student_name,
        value: `${PICKDROP_LABEL[r.status] || r.status}${where ? ` · ${where}` : ""}`,
        tone: r.status === "picked" ? "ok" : r.status === "dropped" ? "mute" : r.status === "pending" ? "warn" : "mute",
      };
    });

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
      : pickdropRow.status === "not_assigned"
        ? "Not linked to a route"
        : [PICKDROP_LABEL[pickdropRow.status] || pickdropRow.status, pickdropStopText(pickdropRow)]
            .filter(Boolean)
            .join(" · ");

  const quickLinks = [
    {
      to: "/parent/pickdrop",
      icon: Bus,
      title: "Pick & Drop",
      summary: pickdropText,
      rows: pdLoading ? [] : pickdropHistory,
    },
    {
      to: "/parent/attendance",
      icon: Check,
      title: "Attendance",
      summary: attendanceText,
      rows: attLoading ? [] : attendanceHistory,
    },
    {
      to: "/parent/marks",
      icon: Trophy,
      title: "Report Card",
      summary: marksText,
      rows: marksLoading ? [] : marksHistory,
    },
    {
      to: "/parent/leave",
      icon: CalendarDays,
      title: "Leave Request",
      summary: leaveText,
      rows: leaveLoading ? [] : leaveHistory,
    },
  ];

  if (!selectedChild) return null;

  return (
    <>
      <PageHeader
        title="Good day"
        subtitle={`Here's what's happening with ${selectedChild.name.split(" ")[0]} today`}
      />

      <Card className={`card white ${styles.studentCard}`}>
          <div className="avatar">{initials(selectedChild.name)}</div>
          <div className={styles.studentDetails}>
            <b className={styles.studentName}>{selectedChild.name}</b>
            <div className={styles.studentStatus}>
              <Pill tone={selectedChild.present_today ? "ok" : "warn"}>
                {selectedChild.present_today ? "Present today" : "Marked absent"}
              </Pill>
            </div>
          </div>
      </Card>

      <div className="section-label">Quick access</div>
      <div className={`grid2 ${styles.quickGrid}`}>
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
      </div>

      <div className="section-label">Announcements & timetable</div>
      <div className={styles.updatesGrid}>
        <Card className={`card ${styles.announcements}`}>
          <b className={styles.summaryTitle}><Megaphone aria-hidden="true" className={styles.summaryIcon} /> Announcements</b>
          <div className={styles.announcementFeed}>
            <BroadcastFeed
              data={broadcasts}
              loading={loading}
              error={error}
              limit={12}
              bare
              empty="No announcements for your children yet."
            />
          </div>
        </Card>
        {ttLoading && <Spinner />}
        {!ttLoading &&
          (timetable && timetable.length ? (
            <Card className={`card white ${styles.timetable} ${styles.timetableCard}`}>
              <span className={styles.timetableTitle}>Weekly summary</span>
              <DataTable label="Weekly timetable summary" className={styles.timetableViewport}>
              <table className={styles.timetableTable}>
                <thead>
                  <tr>
                    <th className={styles.timeHeader} scope="col">Time</th>
                    {DAYS.map((day) => (
                      <th key={day} className={day === today ? styles.today : undefined}>
                        {day}
                        {day === today ? " · today" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((start) => (
                    <tr key={start}>
                      <th className={styles.timeCell} scope="row">{displayTime(start)}</th>
                      {DAYS.map((day) => {
                        const entry = ttEntryMap.get(`${day}|${start}`);
                        return (
                          <td key={day} className={entry ? styles.activeCell : ""}>
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
              </DataTable>
            </Card>
          ) : (
            <Card className={`card ${styles.timetable}`}>
              <EmptyState>No timetable has been published for this class yet.</EmptyState>
            </Card>
          ))}
        <GalleryCard
          title={<><ImageIcon aria-hidden="true" className={styles.summaryIcon} /> Gallery</>}
          summary={galleryText}
          items={galleryLoading ? [] : galleryItems}
          onNavigate={() => navigate("/parent/gallery")}
          className={styles.gallery}
        />
      </div>
    </>
  );
}
