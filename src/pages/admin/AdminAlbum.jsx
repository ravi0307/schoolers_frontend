import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import * as mediaApi from "../../api/media";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";

export default function AdminAlbum() {
  const { data, loading, error } = useApi(() => mediaApi.listMedia(), []);

  return (
    <AdminShell>
      <div className="scr-title">School Album</div>
      <div className="scr-sub">School media shared with your community</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data?.length ? (
            data.map((item) => (
              <div key={item.media_id} className="listitem">
                <div className="avatar">{item.icon || "🖼️"}</div>
                <div className="meta">
                  <b>{item.title}</b>
                  <span>Posted by {item.posted_by}{item.class_id ? ` · Class #${item.class_id}` : ""}</span>
                </div>
              </div>
            ))
          ) : (
            <Empty>No album items yet.</Empty>
          )}
        </div>
      )}
    </AdminShell>
  );
}
