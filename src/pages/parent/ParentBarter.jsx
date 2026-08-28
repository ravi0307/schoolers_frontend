import { useState } from "react";
import ParentShell from "../../components/layout/ParentShell";
import { useApi } from "../../hooks/useApi";
import * as barterApi from "../../api/barter";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

export default function ParentBarter() {
  const { data, loading, error, refetch } = useApi(() => barterApi.listBarter(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      toast("Enter an item title");
      return;
    }
    setSubmitting(true);
    try {
      await barterApi.createBarter({ title, price: price || "Free", listed_by: "Me" });
      toast("Listing created");
      setTitle("");
      setPrice("");
      setFormOpen(false);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ParentShell>
      <div className="scr-title">Barter</div>
      <div className="scr-sub">Buy, sell or swap used goods within your school</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && (
        <div className="grid2">
          {data && data.length ? (
            data.map((b) => (
              <div key={b.listing_id} className="card white">
                <b style={{ fontSize: 12.5 }}>{b.title}</b>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                  {b.price} · {b.listed_by}
                </div>
              </div>
            ))
          ) : (
            <Empty>No listings yet.</Empty>
          )}
        </div>
      )}

      {formOpen ? (
        <form className="card white" onSubmit={submit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Item title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. School bag" />
          </div>
          <div className="field">
            <label>Price</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ₹200 or Free" />
          </div>
          <div className="cta-row">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Publishing..." : "Publish Listing"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn gold block" style={{ marginTop: 12 }} onClick={() => setFormOpen(true)}>
          + List an Item
        </button>
      )}
    </ParentShell>
  );
}
