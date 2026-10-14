import { useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as leaveApi from "../../api/leave";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import Modal from "../../components/ui/Modal";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";
import styles from "./AdminLeave.module.css";

export default function AdminLeave() {
  const { data, loading, error, refetch } = useApi(() => leaveApi.listLeave(), []);
  const toast = useToast();

  const pending = (data || []).filter((l) => l.status === "Pending");
  const resolved = (data || []).filter((l) => l.status !== "Pending");
  const pendingPager = usePagination(pending);
  const resolvedPager = usePagination(resolved);

  const [decision, setDecision] = useState(null);
  const [remark, setRemark] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  function openDecision(request, action) {
    setDecision({ request, action });
    setRemark("");
  }

  function closeDecision() {
    if (savingDecision) return;
    setDecision(null);
    setRemark("");
  }

  async function confirmDecision() {
    if (!decision || savingDecision) return;
    const body = remark.trim() ? { remark: remark.trim() } : undefined;
    setSavingDecision(true);
    try {
      if (decision.action === "Approved") {
        await leaveApi.approveLeave(decision.request.leave_id, body);
        toast("Approved");
      } else {
        await leaveApi.rejectLeave(decision.request.leave_id, body);
        toast("Rejected");
      }
      setDecision(null);
      setRemark("");
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSavingDecision(false);
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
              pendingPager.pageItems.map((l) => (
                <div key={l.leave_id} className="listitem">
                  <div className="meta">
                    <b>{l.requester_name} · {l.requester_type}</b>
                    <span>{l.from_date} → {l.to_date} · {l.reason}</span>
                  </div>
                  <div className={styles.requestActions}>
                    <button className="btn primary sm" aria-label={`Approve leave request from ${l.requester_name}`} onClick={() => openDecision(l, "Approved")}>✓</button>
                    <button className="btn ghost sm" aria-label={`Reject leave request from ${l.requester_name}`} onClick={() => openDecision(l, "Rejected")}>✕</button>
                  </div>
                </div>
              ))
            ) : (
              <Empty>No pending requests.</Empty>
            )}
            <Pagination {...pendingPager} />
          </div>

          <div className="section-label">History</div>
          <div className="card table-card">
            {resolved.length ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedPager.pageItems.map((l) => (
                      <tr key={l.leave_id}>
                        <td>
                          <b>{l.requester_name}</b>
                          <span className={styles.historySub}>{l.requester_type}</span>
                        </td>
                        <td>{l.from_date} → {l.to_date}</td>
                        <td>
                          <Pill tone={l.status === "Approved" ? "ok" : "warn"}>{l.status}</Pill>
                        </td>
                        <td className={styles.historyRemark}>
                          {l.review_remark ? l.review_remark : <span className={styles.historyEmpty}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No resolved requests yet.</Empty>
            )}
            <Pagination {...resolvedPager} />
          </div>
        </>
      )}

      {decision && (
        <Modal onClose={closeDecision} titleId="leave-decision-title" overlayClassName="confirm-overlay" panelClassName="confirm-box">
          <div className="confirm-title" id="leave-decision-title">
            {decision.action === "Approved" ? "Approve" : "Reject"} leave request
          </div>
          <div className="confirm-message">
            {decision.request.requester_name} · {decision.request.requester_type} · {decision.request.from_date} → {decision.request.to_date}
          </div>
          <div className="field">
            <label htmlFor="leave-decision-remark">Remark (optional)</label>
            <textarea
              id="leave-decision-remark"
              rows={3}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="e.g. Cover arranged for these days"
              disabled={savingDecision}
            />
          </div>
          <div className="confirm-actions">
            <button className="btn ghost" type="button" onClick={closeDecision} disabled={savingDecision}>Cancel</button>
            <button
              className={decision.action === "Approved" ? "btn primary" : "btn danger"}
              type="button"
              onClick={confirmDecision}
              disabled={savingDecision}
            >
              {savingDecision ? "Saving…" : decision.action === "Approved" ? "Approve" : "Reject"}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
