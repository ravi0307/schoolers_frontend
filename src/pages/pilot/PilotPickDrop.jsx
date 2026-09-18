import PilotShell from "../../components/layout/PilotShell";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import { useToast } from "../../context/ToastContext";
import { Spinner, ErrorBanner, Empty } from "../../components/ui/Primitives";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { apiErrorMessage } from "../../api/client";

const STATUS_CYCLE = ["pending", "picked", "dropped"];
const STATUS_TONE = { pending: "mute", picked: "info", dropped: "ok" };

export default function PilotPickDrop() {
  const { data: routes, loading: routesLoading } = useApi(() => transportApi.listRoutes(), []);
  const route = routes && routes[0];
  const toast = useToast();

  const { data: stops } = useApi(() => (route ? transportApi.listStops(route.route_id) : Promise.resolve([])), [route?.route_id]);
  const { data: students, loading, error, refetch } = useApi(
    () => (route ? transportApi.listRouteStudents(route.route_id) : Promise.resolve([])),
    [route?.route_id]
  );
  const pager = usePagination(students);

  async function cycleStatus(studentId, current) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    try {
      await transportApi.updatePickupStatus(route.route_id, studentId, next);
      refetch();
    } catch (err) {
      toast(apiErrorMessage(err));
    }
  }

  if (routesLoading) return <PilotShell><Spinner /></PilotShell>;
  if (!route) return <PilotShell><Empty>No route assigned yet.</Empty></PilotShell>;

  return (
    <PilotShell>
      <div className="scr-title">Pick &amp; Drop</div>
      <div className="scr-sub">{route.name} · {route.vehicle}</div>

      <div className="section-label">Stops</div>
      <div className="card">
        {stops && stops.length ? (
          stops.map((s) => (
            <div key={s.stop_id} className="listitem">
              <div className="avatar g">{s.stop_name.charAt(0)}</div>
              <div className="meta">
                <b>{s.stop_name}</b>
                <span>Pickup {s.pickup_time} · Drop {s.drop_time}</span>
              </div>
            </div>
          ))
        ) : (
          <Empty>No stops set.</Empty>
        )}
      </div>

      <div className="section-label">Students</div>
      {loading && <Spinner />}
      <ErrorBanner message={error} />
      {!loading && !error && (
        <div className="card">
          {students && students.length ? (
            pager.pageItems.map((s) => (
              <div key={s.id} className="listitem">
                <div className="meta"><b>Student #{s.student_id}</b></div>
                <span
                  className={`pill ${STATUS_TONE[s.status]}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => cycleStatus(s.student_id, s.status)}
                >
                  {s.status}
                </span>
              </div>
            ))
          ) : (
            <Empty>No students on this route.</Empty>
          )}
          <Pagination {...pager} />
        </div>
      )}
    </PilotShell>
  );
}