---
name: testing-schoolers-local-stack
description: How to bring up the Schoolers full stack (Postgres + FastAPI microservices + Vite frontend) locally in order to test schoolers_frontend UI changes end to end.
---

# Running the Schoolers stack locally for UI testing

The frontend (`schoolers_frontend`) is useless without the backend: login and all
admin data come from `http://localhost:8000/api/v1` (override with `VITE_API_URL`).
The backend repo (`schoolers_backend`, FastAPI gateway + 15 microservices) is usually
cloned as a sibling at `/home/ubuntu/repos/schoolers-backend`.

## 1. Postgres (no local server is installed; use Docker)

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
# role + db must be created in SEPARATE psql -c calls (CREATE DATABASE cannot run
# inside the implicit transaction psql uses for multi-statement -c strings)
docker exec pg psql -U postgres -c "CREATE ROLE ravi LOGIN SUPERUSER PASSWORD 'ravi';"
docker exec pg psql -U postgres -c "CREATE DATABASE schoolersdb OWNER ravi;"
# The dump lives in the FRONTEND repo root
docker cp <frontend>/schoolersdb_backup.sql pg:/tmp/db.sql
docker exec pg psql -U ravi -d schoolersdb -f /tmp/db.sql
```

Two gotchas that produce a `{"detail":"Database error"}` on login:

1. The dump creates everything in a `schoolers` schema, but the models are
   unqualified, so you get `relation "users" does not exist`. Fix:
   `docker exec pg psql -U postgres -c "ALTER ROLE ravi SET search_path TO schoolers, public;"`
   (then restart the services).
2. The default `DATABASE_URL` has no password. Write
   `DATABASE_URL=postgresql://ravi:ravi@127.0.0.1:5432/schoolersdb` into
   `schoolers-backend/common/.env` — that single file is read by every service.

Always check `schoolers-backend/.logs/<service>.log` for the real traceback; the
gateway only ever returns the generic "Database error".

## 2. Backend services

```bash
cd /home/ubuntu/repos/schoolers-backend
python3 -m venv .venv && .venv/bin/pip install -r services/transport_service/requirements.txt
sed -i 's|python3 -m uvicorn|'$PWD'/.venv/bin/python -m uvicorn|g' run_all.sh
setsid nohup ./run_all.sh > /tmp/runall.log 2>&1 < /dev/null &
```

`run_all.sh` backgrounds 15 services + the gateway. IMPORTANT: if you launch it from
a shell-tool call that later times out, the whole process group can be killed and you
end up with 1 surviving uvicorn. Launch it with `setsid nohup ... &` and verify with
`pgrep -fc "uvicorn main:app"` (expect 16) and
`curl -s localhost:8000/health/services`. Stop with `pkill -f 'uvicorn main:app'`.

Smoke test login:
```bash
curl -s -X POST localhost:8000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin1","password":"test1234"}'
```

## 3. Frontend

```bash
cd /home/ubuntu/repos/schoolers-frontend
npm install
# npm optional-deps bug: native bindings are missing after a plain install
npm install --no-save @rolldown/binding-linux-x64-gnu@1.2.2 @oxlint/binding-linux-x64-gnu@1.75.0
npm run dev   # http://localhost:5173
```

Node 20.18.1 triggers a Vite "wants 20.19+" warning; dev and build still work.

## 4. Test accounts

The seeded usernames and their shared password are listed under "Test accounts" in the
frontend `README.md`. Use the School Admin one (`admin1`, school_id 1) — that is the role
`/admin/routes` requires.

## 5. Route stops feature

`/admin/routes` → open a route (school 1 owns routes 1 and 2, already seeded with
stops) → "Pickup & drop points" → "+ Add Pickup / Drop Point".
API: `GET/POST /routes/:id/stops`, `DELETE /routes/stops/:stopId`
(`src/api/transport.js`). The `route_stops` table stores one `stop_time` +
`stop_type` per row, so one submit with both a pickup and a drop time creates two
rows with the same name.

## Devin Secrets Needed

None — everything runs locally with the seeded dump and the shared `test1234` password.
