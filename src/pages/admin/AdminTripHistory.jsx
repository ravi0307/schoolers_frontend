import { useMemo, useState } from "react";
import { useApi } from "../../hooks/useApi";
import * as transportApi from "../../api/transport";
import PageHeader from "../../components/ui/PageHeader";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import styles from "./AdminTripHistory.module.css";

const EMPTY_LIST = [];

function TripDetails({ tripId }) {
  const { data, loading, error } = useApi(
    () => (tripId ? transportApi.getTripDetails(tripId) : Promise.resolve(null)),
    [tripId]
  );

  if (!tripId) return null;
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className={styles.detailPanel}>
      <div className={styles.infoRow}><b>Date</b><span>{data.trip_date || "—"}</span></div>
      <div className={styles.infoRow}><b>Direction</b><span>{data.direction || "—"}</span></div>
      <div className={styles.infoRow}><b>Driver</b><span>{data.driver_name || "—"}</span></div>
      <div className={styles.infoRow}><b>Vehicle</b><span>{data.vehicle || "—"}</span></div>
      <div className={styles.infoRow}><b>Outcome</b><span>{data.outcome_summary || "—"}</span></div>
      {data.cancellation_reason && (
        <div className={styles.infoRow}><b>Cancellation reason</b><span>{data.cancellation_reason}</span></div>
      )}
      {data.students?.length > 0 && (
        <div className={styles.studentRoster}>
          <h2>Students</h2>
          <ul>
            {data.students.map((student) => (
              <li key={student.student_id}>
                {student.student_name}: {student.boarding_status} / {student.drop_status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminTripHistory() {
  const { data, loading, error } = useApi(() => transportApi.listAdminTrips(), []);
  const trips = Array.isArray(data) ? data : EMPTY_LIST;
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);

  const routes = useMemo(
    () => [...new Set(trips.map((trip) => trip.route_name).filter(Boolean))].sort(),
    [trips]
  );
  const filteredTrips = useMemo(
    () => trips.filter((trip) =>
      (!filterRoute || trip.route_name === filterRoute) &&
      (!filterStatus || trip.status === filterStatus) &&
      (!filterDirection || trip.direction === filterDirection) &&
      (!filterFrom || trip.trip_date >= filterFrom) &&
      (!filterTo || trip.trip_date <= filterTo)
    ),
    [trips, filterRoute, filterStatus, filterDirection, filterFrom, filterTo]
  );
  const pager = usePagination(filteredTrips, 20);

  return (
    <>
      <PageHeader title="Trip History" subtitle="Administrative history of school trips" />
      <div className={styles.filtersBar}>
        <label>
          Route
          <select className={styles.filterSelect} value={filterRoute} onChange={(event) => setFilterRoute(event.target.value)}>
            <option value="">All routes</option>
            {routes.map((route) => <option key={route} value={route}>{route}</option>)}
          </select>
        </label>
        <label>
          Status
          <select className={styles.filterSelect} value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">All statuses</option>
            {["scheduled", "in_progress", "completed", "cancelled"].map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select className={styles.filterSelect} value={filterDirection} onChange={(event) => setFilterDirection(event.target.value)}>
            <option value="">Both directions</option>
            <option value="pickup">Pickup</option>
            <option value="drop">Drop</option>
          </select>
        </label>
        <label>
          From
          <input className={styles.filterInput} type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} />
        </label>
        <label>
          To
          <input className={styles.filterInput} type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} />
        </label>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && filteredTrips.length === 0 && <Empty>No trips found.</Empty>}
      {!loading && !error && filteredTrips.length > 0 && (
        <div className={styles.tripTable}>
          <table>
            <thead>
              <tr><th>Date</th><th>Route</th><th>Direction</th><th>Status</th><th>Driver</th><th>Details</th></tr>
            </thead>
            <tbody>
              {pager.pageItems.map((trip) => (
                <tr key={trip.trip_id}>
                  <td>{trip.trip_date || "—"}</td>
                  <td>{trip.route_name || "—"}</td>
                  <td>{trip.direction || "—"}</td>
                  <td><Pill tone={trip.status === "completed" ? "ok" : "mute"}>{trip.status?.replace(/_/g, " ") || "—"}</Pill></td>
                  <td>{trip.driver_name || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost small"
                      aria-expanded={selectedTripId === trip.trip_id}
                      onClick={() => setSelectedTripId(selectedTripId === trip.trip_id ? null : trip.trip_id)}
                    >
                      {selectedTripId === trip.trip_id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedTripId && <TripDetails tripId={selectedTripId} />}
          <Pagination {...pager} />
        </div>
      )}
    </>
  );
}
