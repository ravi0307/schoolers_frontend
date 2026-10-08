import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeTripList, resolveTripRoster } from "../src/utils/tripHistory.js";

const source = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("trip list normalization accepts arrays and supported paginated response shapes", () => {
  const trips = [{ trip_id: 1 }, { trip_id: 2 }];

  assert.deepEqual(normalizeTripList(trips), trips);
  assert.deepEqual(normalizeTripList({ items: trips, total: 2 }), trips);
  assert.deepEqual(normalizeTripList({ data: trips }), trips);
  assert.deepEqual(normalizeTripList(null), []);
  assert.deepEqual(normalizeTripList({ items: null }), []);
});

test("trip detail prefers historical snapshots and explicitly maps legacy route roster", () => {
  const snapshot = {
    student_id: 4,
    student_name: "Aarav Rao",
    boarding_status: "did_not_board",
    drop_status: "pending",
  };
  const routeStudents = [
    { student_id: 1, student_name: "Anika Rao", status: "picked" },
    { student_id: 2, student_name: "Dev Rao", status: "dropped" },
    { student_id: 3, student_name: "Mira Rao", status: "pending" },
  ];

  assert.deepEqual(resolveTripRoster([snapshot], routeStudents), {
    students: [snapshot],
    isCurrentRouteRoster: false,
  });
  assert.deepEqual(resolveTripRoster([], routeStudents), {
    students: [
      {
        student_id: 1,
        student_name: "Anika Rao",
        boarding_status: "picked",
        drop_status: "pending",
        boarding_at: null,
        drop_at: null,
        boarding_stop_id: null,
        drop_stop_id: null,
      },
      {
        student_id: 2,
        student_name: "Dev Rao",
        boarding_status: "picked",
        drop_status: "dropped",
        boarding_at: null,
        drop_at: null,
        boarding_stop_id: null,
        drop_stop_id: null,
      },
      {
        student_id: 3,
        student_name: "Mira Rao",
        boarding_status: "pending",
        drop_status: "pending",
        boarding_at: null,
        drop_at: null,
        boarding_stop_id: null,
        drop_stop_id: null,
      },
    ],
    isCurrentRouteRoster: true,
  });
  assert.deepEqual(resolveTripRoster([], []), {
    students: [],
    isCurrentRouteRoster: false,
  });
});

test("pilot completed trip cards expand inline and load pilot detail plus route stops", () => {
  const page = source("src/pages/pilot/PilotTrips.jsx");
  const styles = source("src/pages/pilot/PilotTrips.module.css");

  assert.match(page, /const items = normalizeTripList\(listData\)/);
  assert.match(page, /trip\.status !== "completed"/);
  assert.match(page, /role=\{completed \? "button" : undefined\}/);
  assert.match(page, /aria-expanded=\{completed \? expanded : undefined\}/);
  assert.match(page, /\{expanded && \([\s\S]*?<PilotTripDetails trip=\{trip\} \/>/);
  assert.match(page, /tripsApi\.getMyTripDetails\(trip\.trip_id\)/);
  assert.match(page, /transportApi\.listStops\(trip\.route_id\)/);
  assert.match(page, /transportApi\.listRouteStudents\(trip\.route_id\)/);
  assert.match(page, /isCurrentRouteRoster/);
  assert.match(page, /not a historical snapshot/);
  assert.match(page, /STOPS TRACKING/);
  assert.match(page, /STUDENTS \(\{students\.length\} EXPECTED · \{boarded\} BOARDED · \{absentOrMissing\} ABSENT\/MISSING\)/);
  assert.match(page, /aria-label="Stop logged"/);
  assert.match(page, /Total Time:/);
  assert.match(page, /student\.boarding_at/);
  assert.match(page, /student\.drop_at/);
  assert.match(styles, /\.expandedDetails\s*\{[^}]*background:\s*#f8fbfc/s);
  assert.match(styles, /\.detailsTableWrap\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /\.refreshRow\s*\{/);
});

test("parent trip history renders normalized records and pickup/drop details", () => {
  const page = source("src/pages/parent/ParentTripHistory.jsx");
  const styles = source("src/pages/parent/ParentTripHistory.module.css");

  assert.match(page, /const trips = normalizeTripList\(data\)/);
  assert.match(page, /tripsApi\.getChildTripHistory\(selectedChild\.student_id/);
  assert.match(page, /trip\.boarding_stop_name/);
  assert.match(page, /trip\.boarding_status/);
  assert.match(page, /trip\.drop_stop_name/);
  assert.match(page, /trip\.drop_status/);
  assert.match(page, /outcomeTone\(trip\.boarding_status\)/);
  assert.match(page, /outcomeTone\(trip\.drop_status\)/);
  assert.match(page, /value === "picked" \|\| value === "dropped"/);
  assert.match(page, /value === "did_not_board" \|\| value === "drop_not_recorded"/);
  assert.match(styles, /\.tripItem\s*\{[^}]*background:\s*var\(--color-surface\)/s);
  assert.match(styles, /\.detailPanel\s*\{[^}]*background:\s*var\(--color-neutral-0\)/s);
  assert.match(styles, /\.rangeChip\[data-selected="true"\]\s*\{[^}]*background:\s*var\(--color-primary\)[^}]*color:\s*var\(--color-text-on-dark\)/s);
  assert.match(styles, /\.outcomeSuccess\s*\{[^}]*color:\s*var\(--color-success\)/s);
  assert.match(styles, /\.outcomeMissed\s*\{[^}]*color:\s*var\(--color-danger-strong\)/s);
  assert.match(styles, /@media \(max-width:\s*40rem\)[\s\S]*?\.tripRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/s);
});

test("admin completed trip details expose stop and child outcome breakdowns", () => {
  const page = source("src/pages/admin/AdminTripHistory.jsx");
  const styles = source("src/pages/admin/AdminTripHistory.module.css");

  assert.match(page, /<TripDetails trip=\{trip\} \/>/);
  assert.match(page, /aria-expanded=\{expanded\}/);
  assert.match(page, /\{expanded \? "Hide" : "Details"\}/);
  assert.match(page, /<h2>Stops<\/h2>/);
  assert.match(page, /Children \(\{students\.length\} expected, \{boarded\} boarded, \{didNotBoard\} did not board\)/);
  assert.match(page, /academicsApi\.listClasses\(\)/);
  assert.match(page, /transportApi\.listRouteStudents\(trip\.route_id\)/);
  assert.match(page, /isCurrentRouteRoster/);
  assert.match(page, /not a historical snapshot/);
  assert.match(page, /student_name \|\| `Child #/);
  assert.match(styles, /\.detailRow > td\s*\{[^}]*background:\s*#fff/s);
  assert.match(styles, /\.nestedTable \.missingCell\s*\{[^}]*text-align:\s*center/s);
});
