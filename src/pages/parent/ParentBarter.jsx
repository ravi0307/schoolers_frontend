import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import styles from "./ParentBarter.module.css";
import { useApi } from "../../hooks/useApi";
import * as barterApi from "../../api/barter";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner } from "../../components/ui/Primitives";
import EmptyState from "../../components/ui/EmptyState";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

export default function ParentBarter() {
  const { data, loading, error, refetch } = useApi(() => barterApi.listBarter(), []);
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pager = usePagination(data);

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
    <>
      <PageHeader
        title="Barter"
        subtitle="Buy, sell or swap used goods within your school"
        action={!formOpen && (
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            List an Item
          </Button>
        )}
      />
      {loading && <Spinner />}
      <ErrorBanner message={error} />

      {!loading && (
        <>
          <div className="grid2">
            {data && data.length ? (
              pager.pageItems.map((b) => (
                <Card key={b.listing_id} className={`card white ${styles.listingCard}`}>
                  <b className={styles.listingTitle}>{b.title}</b>
                  <div className={styles.listingMeta}>
                    {b.price} · {b.listed_by}
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState>No listings yet.</EmptyState>
            )}
          </div>
          <Pagination {...pager} />
        </>
      )}

      {formOpen ? (
        <Card as="form" className={`card white ${styles.formCard}`} onSubmit={submit}>
          <FormField id="barter-title" label="Item title" required>
            <input id="barter-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. School bag" />
          </FormField>
          <FormField id="barter-price" label="Price">
            <input id="barter-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. ₹200 or Free" />
          </FormField>
          <div className="cta-row">
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Publishing..." : "Publish Listing"}
            </Button>
            <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
