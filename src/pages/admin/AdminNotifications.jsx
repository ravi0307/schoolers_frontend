import AdminShell from "../../components/layout/AdminShell";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import * as notificationsApi from "../../api/notifications";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { data, loading, error } = useApi(() => notificationsApi.listNotifications(user.schoolId), [user.schoolId]);

  return (
    <AdminShell>
      <div className="scr-title">Notifications</div>
      <div className="scr-sub">Sent by Master Admin regarding dues or activation</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {data && data.length ? (
            data.map((n) => (
              <div key={n.notification_id} className="listitem">
                <div className={`avatar ${n.type === "Dues" ? "r" : n.type === "Activation" ? "y" : "g"}`}>
                  {n.type[0]}
                </div>
                <div className="meta">
                  <b>{n.type}</b>
                  <span>{n.message}</span>
                </div>
                <Pill tone="mute">{n.status}</Pill>
              </div>
            ))
          ) : (
            <Empty>No notifications yet.</Empty>
          )}
        </div>
      )}
    </AdminShell>
  );
}
