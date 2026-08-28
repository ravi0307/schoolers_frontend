import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as leaveApi from "../../api/leave";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function AdminLeave() {
  const { data, loading, error, refetch } = useApi(() => leaveApi.listLeave(), []);
  const toast = useToast();

  const pending = (data || []).filter((l) => l.status === "Pending");
  const resolved = (data || []).filter((l) => l.status !== "Pending");

  async function approve(id) {
    try {
      await leaveApi.approveLeave(id);
      toast("Approved");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  async function reject(id) {
    try {
      await leaveApi.rejectLeave(id);
      toast("Rejected");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  return (
    <AdminShell>
      <div className="scr-title">Leave Requests</div>
      <div className="scr-sub">From teachers, students, staff, and pilots</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && !error && (
        <>
          <div className="section-label">Pending ({pending.length})</div>
          <div className="card">
            {pending.length ? (
              pending.map((l) => (
                <div key={l.leave_id} className="listitem">
                  <div className="meta">
                    <b>{l.requester_name} · {l.requester_type}</b>
                    <span>{l.from_date} → {l.to_date} · {l.reason}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn primary sm" onClick={() => approve(l.leave_id)}>✓</button>
                    <button className="btn ghost sm" onClick={() => reject(l.leave_id)}>✕</button>
                  </div>
                </div>
              ))
            ) : (
              <Empty>No pending requests.</Empty>
            )}
          </div>

          <div className="section-label">History</div>
          <div className="card">
            {resolved.length ? (
              resolved.map((l) => (
                <div key={l.leave_id} className="listitem">
                  <div className="meta">
                    <b>{l.requester_name} · {l.requester_type}</b>
                    <span>{l.from_date} → {l.to_date}</span>
                  </div>
                  <Pill tone={l.status === "Approved" ? "ok" : "warn"}>{l.status}</Pill>
                </div>
              ))
            ) : (
              <Empty>No resolved requests yet.</Empty>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
