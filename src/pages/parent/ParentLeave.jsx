import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import { useParentContext } from "../../context/ParentContext";
import { useApi } from "../../hooks/useApi";
import * as leaveApi from "../../api/leave";
import { useToast } from "../../context/ToastContext";
import { Spinner, Pill } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

export default function ParentLeave() {
  const { selectedChild } = useParentContext();
  const toast = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useApi(() => leaveApi.listMine(), []);
  const mine = (data || []).filter((l) => l.requester_name === selectedChild?.name);
  const pager = usePagination(mine);

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
    <>
      <PageHeader
        title="Leave Request"
        subtitle={selectedChild ? `For ${selectedChild.name} · sent to School Admin` : ""}
      />

      <Card as="form" className="card" onSubmit={submit}>
        <div className="grid2">
          <FormField id="leave-from" label="From" required>
            <input id="leave-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </FormField>
          <FormField id="leave-to" label="To" required>
            <input id="leave-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </FormField>
        </div>
        <FormField id="leave-reason" label="Reason">
          <textarea id="leave-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function" />
        </FormField>
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Submit Request"}
        </Button>
      </Card>

      <div className="section-label">Your requests</div>
      {loading ? (
        <Spinner />
      ) : (
        <Card className="card">
          {mine.length ? (
            pager.pageItems.map((l) => (
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
            <EmptyState>No leave requests yet.</EmptyState>
          )}
          <Pagination {...pager} />
        </Card>
      )}
    </>
  );
}
