import { useState } from "react";
import MobileLayout from "../../components/layout/MobileLayout";
import { useApi } from "../../hooks/useApi";
import * as leaveApi from "../../api/leave";
import { useToast } from "../../context/ToastContext";
import { Spinner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

const TABS = [
  { to: "/pilot/pickdrop", icon: "🚌", label: "Pick & Drop" },
  { to: "/pilot/leave", icon: "📅", label: "Leave" },
];

export default function PilotLeave() {
  const toast = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, refetch } = useApi(() => leaveApi.listLeave(), []);
  const mine = (data || []).filter((l) => l.requester_type === "Pilot");

  async function submit(e) {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast("Pick a start and end date");
      return;
    }
    setSubmitting(true);
    try {
      await leaveApi.createLeave({
        requester_type: "Pilot",
        requester_name: "Me",
        from_date: fromDate,
        to_date: toDate,
        reason,
      });
      toast("Leave request sent");
      setFromDate("");
      setToDate("");
      setReason("");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileLayout tabs={TABS}>
      <div className="scr-title">Leave Request</div>
      <div className="scr-sub">Sent to School Admin for approval</div>
      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field"><label>From</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div className="field"><label>To</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </div>
        <div className="field"><label>Reason</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Submit Request"}
        </button>
      </form>

      <div className="section-label">Your requests</div>
      {loading ? <Spinner /> : (
        <div className="card">
          {mine.length ? mine.map((l) => (
            <div key={l.leave_id} className="listitem">
              <div className="meta"><b>{l.from_date} → {l.to_date}</b><span>{l.reason}</span></div>
              <Pill tone={l.status === "Approved" ? "ok" : l.status === "Rejected" ? "warn" : "mute"}>{l.status}</Pill>
            </div>
          )) : <Empty>No leave requests yet.</Empty>}
        </div>
      )}
    </MobileLayout>
  );
}
