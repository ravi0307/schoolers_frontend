import { useState } from "react";
import ParentShell from "../../components/layout/ParentShell";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as leaveApi from "../../api/leave";
import { useToast } from "../../context/ToastContext";
import { Spinner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function ParentLeave() {
  const { selectedChild } = useParentContext();
  const toast = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useApi(() => leaveApi.listLeave(), []);
  const mine = (data || []).filter((l) => l.requester_name === selectedChild?.name);

  async function submit(e) {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast("Pick a start and end date");
      return;
    }
    setSubmitting(true);
    try {
      await leaveApi.createLeave({
        requester_type: "Student",
        requester_name: selectedChild.name,
        from_date: fromDate,
        to_date: toDate,
        reason,
      });
      toast("Leave request sent to School Admin");
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
    <ParentShell>
      <div className="scr-title">Leave Request</div>
      <div className="scr-sub">{selectedChild ? `For ${selectedChild.name} · sent to School Admin` : ""}</div>

      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function" />
        </div>
        <button className="btn primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Submit Request"}
        </button>
      </form>

      <div className="section-label">Your requests</div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          {mine.length ? (
            mine.map((l) => (
              <div key={l.leave_id} className="listitem">
                <div className="meta">
                  <b>{l.from_date} → {l.to_date}</b>
                  <span>{l.reason}</span>
                </div>
                <Pill tone={l.status === "Approved" ? "ok" : l.status === "Rejected" ? "warn" : "mute"}>
                  {l.status}
                </Pill>
              </div>
            ))
          ) : (
            <Empty>No leave requests yet.</Empty>
          )}
        </div>
      )}
    </ParentShell>
  );
}
