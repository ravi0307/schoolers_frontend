import { useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import { useApi } from "../../hooks/useApi";
import { Spinner, ErrorBanner, Empty, Pill } from "../../components/ui/Primitives";
import { usePagination } from "../../components/ui/Pagination";
import styles from "./AdminTripHistory.module.css";

const EMPTY_LIST = [];

/**
 * Admin Trip History.
 *
 * Read-only history of all school trips. Admins can filter by route,
 * status, direction, and date range. Clicking "Details" on a trip
 * fetches and displays the full trip record.
 */

function TripRow({ trip, onDetails }) {
  const { trip_id, route_name, direction, status, started_at, ended_at, driver, vehicle, summary } = trip;

  return (
    <div className="admin-trip-row">
      <div className="admin-trip-date">{started_at ? new Date(started_at).toLocaleDateString() : "—"}</div>
      <div className="admin-trip-route">{route_name || "—"}</div>
      <div className="admin-trip-status">{status ? status.replace(/_/g, " ") : "—"}</div>
      <div className="admin-trip-what-happened">{summary || "—"}</div>
      <div className="admin-trip-driver">{driver || "—"}</div>
      <div className="admin-trip-actions">
        <button className="btn ghost small" onClick={() => onDetails(trip_id)}>
          Details
        </button>
      </div>
    </div>
  );
}

function AdminTripHistory() {
  const { data: trips, loading, error } = useApi(() => transportApi.listAdminTrips(), []);
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { pageItems, pagination } = usePagination(trips || [], 20);

  const filteredTrips = pageItems.filter((trip) => {
    const routeMatch = !filterRoute || trip.route_name === filterRoute;
    const statusMatch = !filterStatus || trip.status === filterStatus;
    const directionMatch = !filterDirection || trip.direction === filterDirection;
    const fromMatch = !filterFrom || new Date(trip.started_at) >= new Date(filterFrom);
    const toMatch = !filterTo || new Date(trip.ended_at) <= new Date(filterTo);
    return routeMatch && statusMatch && directionMatch && fromMatch && toMatch;
  });

  const handleDetails = (tripId) => {
    // Show details for this trip
  };

  return (
    <AdminShell>
      <div className="page-header">
        <div className="scr-title">Trip History</div>
        <div className="scr-sub">Administrative history of all school trips</div>
      </div>

      {loading && <Spinner />}

      {error && <ErrorBanner message={error} />}

      {!loading && !error && (
        <>
          <div className="filters-bar">
            <select className="filter-select" onChange={(e) => setFilterRoute(e.target.value)}>
              <option value="">All routes</option>
            </select>

            <select className="filter-select" onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
            </select>

            <select className="filter-select" onChange={(e) => setFilterDirection(e.target.value)}>
              <option value="">Both directions</option>
            </select>

            <div className="filter-group">
              <label>From</label>
              <input type="date" className="filter-input" onChange={(e) => setFilterFrom(e.target.value)} />
            </div>

            <div className="filter-group">
              <label>To</label>
              <input type="date" className="filter-input" onChange={(e) => setFilterTo(e.target.value)} />
            </div>
          </div>

          {filteredTrips.length === 0 && (
            <Empty>No trips found.</Empty>
          )}

          <div className="trip-table">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>ROUTE</th>
                  <th>STATUS</th>
                  <th>WHAT HAPPENED</th>
                  <th>DRIVER</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.trip_id}>
                    <td>{trip.started_at ? new Date(trip.started_at).toLocaleDateString() : "—"}</td>
                    <td>{trip.route_name || "—"}</td>
                    <td>{trip.status ? trip.status.replace(/_/g, " ") : "—"}</td>
                    <td>{trip.summary || "—"}</td>
                    <td>{trip.driver || "—"}</td>
                    <td>
                      <button className="btn ghost small" onClick={() => handleDetails(trip.trip_id)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && (
            <>
              <span>Page {pagination.pageIndex + 1} of {pagination.pageCount}</span>
            </>
          )}
</>
      </AdminShell>
    </div>
  );
}

export default function AdminTripHistoryPage() {
  return (
    <div>
      <AdminTripHistory />
    </div>
  );
}