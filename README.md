# Schoolers Web (React)

React + Vite frontend for the Schoolers school-management platform.

**Works unchanged against either backend deployment** — the original
monolith (`schoolers_backend.zip`) or the microservices split
(`schoolers_microservices.zip`). Both expose the exact same API surface at
`http://localhost:8000/api/v1`; in the microservices version that URL is
the API gateway, which proxies to whichever of the 15 services owns each
path. This app never talks to an individual service directly, so nothing
here needed to change — verified by rebuilding and testing this exact
codebase against a live gateway + 4 running services (login, cross-service
data, and the new health page all confirmed working).

Built and verified against a real running instance of the backend — login,
CORS, and `linked_person_id`-dependent calls (Parent's children, Teacher's
teaching load) all tested end-to-end.

## What's implemented

All 5 roles have a working shell (routing, auth, sidebar/tab-bar nav) and a
solid, representative set of screens per role, each doing **real API calls**
— no mock data:

| Role | Screens |
|---|---|
| **Parent** | Home, Attendance, Report Card (Marks), Leave Request, Barter — with a child switcher for parents with multiple kids |
| **Teacher** | Student List, Mark Attendance, Marks entry (scoped to subjects they actually teach — mirrors the backend's permission check), Timetable — all with a class picker |
| **School Admin** | Dashboard (report overview), Classes, Students (search + add), Teachers (add/remove), Routes (stops + students), Leave approval, School Website builder, Notifications |
| **Pilot** | Pick & Drop (live status cycling, tied to their route's real stops/students), Leave Request |
| **Master Admin** | Schools list + Add School (full contact form), School Detail (feature toggles, stats report, send notification, delete), **System Health** (live up/down status of every microservice, via the gateway's `/health/services`) |

This covers every backend module's core flow. Extending to the remaining
screens from the original HTML prototype (e.g. Insta Class media, Activities,
Barter edit/delete, admin Staff CRUD) is straightforward — copy the pattern
from an existing page in the same role folder; the API client for every
module is already written in `src/api/`.

## Setup

```bash
npm install
```

Point the app at your backend in `.env`:
```
VITE_API_URL=http://localhost:8000/api/v1
```

## Run

```bash
npm run dev
```
Opens on http://localhost:5173 by default. Make sure the FastAPI backend is
running first (see its own README) — the login screen needs it.

## Build for production

```bash
npm run build
```
Outputs a static bundle to `dist/` — verified to build cleanly (127 modules,
~100KB gzipped JS).

## Test accounts

Same as the backend — password `test1234` for all:

| username | role |
|---|---|
| `admin1` | School Admin |
| `teacher1` | Teacher |
| `parent225` | Parent |
| `pilot1` | Pilot |
| `meera.nair` | Master Admin |

## Architecture

```
src/
├── App.jsx                 # all routing, role-scoped route groups
├── main.jsx
├── api/                     # one thin module per backend feature (axios calls)
├── context/
│   ├── AuthContext.jsx       # login/logout, JWT storage, refresh handling
│   ├── ToastContext.jsx      # global toast notifications
│   ├── ParentContext.jsx     # children list + selected child (multi-kid support)
│   └── TeacherContext.jsx    # teaching load + selected class
├── hooks/
│   └── useApi.js              # {data, loading, error, refetch} for any API call
├── components/
│   ├── layout/                # MobileLayout, WebLayout, ProtectedRoute, per-role shells
│   └── ui/                    # Spinner, ErrorBanner, Kpi, Pill, ListItem, ClassPicker
├── pages/
│   ├── parent/ teacher/ admin/ pilot/ master/
│   └── Login.jsx
└── styles/
    └── global.css              # design tokens ported from the original HTML prototype
```

**Auth flow**: JWT access + refresh tokens in `localStorage`. The axios
client (`api/client.js`) auto-attaches the access token to every request and
transparently refreshes on a 401 (with request queuing so concurrent 401s
don't trigger duplicate refresh calls).

**Role-based routing**: `ProtectedRoute` checks both "is logged in" and
"is this role allowed here" — mirrors the backend's RBAC rather than
duplicating a separate permission system.

**Per-role state**: `ParentContext` and `TeacherContext` fetch
`linked_person_id`-scoped data once (children / teaching load) and expose a
"currently selected" child/class that all sibling pages read from — same
pattern as the class/child switchers in the original prototype.

## Known gaps / next steps

- **Styling**: uses the LUNA color palette and component classes from the
  prototype's CSS, but isn't a pixel-perfect port of every visual detail
  (device-frame chrome, watermarks, animations) — it's a real working app,
  not a mockup, so the focus was correctness over visual fidelity.
- **Remaining screens**: several prototype screens aren't ported yet (see
  table above) — the API modules exist for all of them, just no page/route.
- **File uploads**: banner/icon fields are URL inputs, matching the backend's
  current `VARCHAR` columns — swap in a real upload flow when the backend
  gets one.
- **Master Admin reports across all schools**: only per-school detail is
  built; a cross-school summary view would be a natural next page.
