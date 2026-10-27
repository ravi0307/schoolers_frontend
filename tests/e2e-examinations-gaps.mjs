// Focused follow-up checks for the examinations E2E verification:
//   1. Admin CSV template-download control (filename, headers, rows).
//   2. Unauthorized (teacher) promotion preview/commit -> HTTP 403, no writes.
//   3. Parent report card grade + percentage assertions, derived
//      independently from DB fixture data and the school grade scale.
//
// Run: node tests/e2e-examinations-gaps.mjs   (Stack B: UI 5174, API 8100,
// DB schoolersdb_e2e). All expected values are computed from the database
// and the pinned grade bands — nothing is hard-coded to make assertions pass.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:5174";
const API = process.env.E2E_API ?? "http://localhost:8100/api/v1";
const PSQL = process.env.E2E_PSQL ?? "/Applications/Postgres.app/Contents/Versions/17/bin/psql";
const WORK = process.env.E2E_WORK ?? "/var/folders/zf/tv6w5m8x4k190vk6_c5qt4kw0000gp/T/opencode/e2e";
const SHOTS = path.join(WORK, "shots");
const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
};
const CREDS = {
  admin: [process.env.E2E_ADMIN_USER ?? "blue.horizon", need("E2E_ADMIN_PASS")],
  teacher: [process.env.E2E_TEACHER_USER ?? "bh.teacher1", need("E2E_TEACHER_PASS")],
  parent: [process.env.E2E_PARENT_USER ?? "bh.parent1", need("E2E_PARENT_PASS")],
};

const results = [];
const pageErrors = [];
let stepNo = 0;
let page;

const t = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (db, sql) => execFileSync(PSQL, ["-d", db, "-At", "-c", sql]).toString().trim();
const round2 = (x) => Math.round(x * 100) / 100;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function shot(label) {
  try {
    await page.screenshot({ path: path.join(SHOTS, `gap-${String(stepNo).padStart(2, "0")}-${label}.png`), fullPage: true });
  } catch { /* page may be closed */ }
}

async function step(name, fn) {
  stepNo += 1;
  try {
    await fn();
    results.push({ n: stepNo, name, ok: true });
    console.log(`PASS  ${stepNo} ${name}`);
  } catch (err) {
    const msg = String(err?.message ?? err).split("\n").slice(0, 6).join(" | ");
    results.push({ n: stepNo, name, ok: false, err: msg });
    console.log(`FAIL  ${stepNo} ${name} :: ${msg}`);
    await shot(`${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-FAIL`);
  }
}

function expectText(want, ms = 8000) {
  if (want instanceof RegExp) {
    const flags = want.flags.includes("i") ? want.flags : `${want.flags}i`;
    return page.waitForFunction(
      (w) => new RegExp(w.re, w.flags).test(document.body.innerText),
      { re: want.source, flags: flags.replace("g", "") },
      { timeout: ms, polling: 200 },
    );
  }
  const needle = want.toLowerCase();
  return page.waitForFunction(
    (x) => document.body.innerText.toLowerCase().includes(x), needle,
    { timeout: ms, polling: 200 },
  );
}

async function openSelect(aria) {
  const trig = page.locator(`[data-select-trigger="true"][aria-label="${aria}"]`);
  await trig.waitFor({ state: "visible", timeout: 8000 });
  await trig.click();
  return trig;
}

async function pick(aria, label) {
  const trig = await openSelect(aria);
  const opt = page.getByRole("option", { name: label, exact: true });
  await opt.waitFor({ timeout: 8000 });
  await opt.click();
  await trig.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
}

async function pickSessionByDate(date) {
  const trig = await openSelect("Session");
  const opt = page.getByRole("option").filter({ hasText: date });
  await opt.waitFor({ timeout: 8000 });
  await opt.click();
  await trig.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
}

async function toastWatcher(want, ms = 8000) {
  const match = (txt) => (want instanceof RegExp ? want.test(txt) : txt.includes(want));
  const deadline = Date.now() + ms;
  const history = new Set();
  while (Date.now() < deadline) {
    const texts = await page.locator('[role="status"]').allInnerTexts().catch(() => []);
    texts.filter(Boolean).forEach((x) => history.add(x));
    if (texts.some(match)) return [...history].join(" || ");
    await t(120);
  }
  throw new Error(`toast not seen (${String(want)}); observed: ${[...history].join(" || ") || "(none)"}`);
}

async function login(user, pass, dest) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("e.g. admin1").fill(user);
  await page.getByPlaceholder("••••••••").fill(pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 12000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
  if (dest) await page.goto(`${BASE}${dest}`);
}

async function api(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => null);
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

async function loginToken(user, pass) {
  const r = await api("POST", `${API}/auth/login`, null, { username: user, password: pass });
  if (!r.json?.access_token) throw new Error(`login failed for ${user}: ${r.status}`);
  return r.json.access_token;
}

function expectEq(got, want, what) {
  if (got !== want) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ---------- environment + independent expectations from the DB ----------
  const ui = await fetch(BASE); // vite dev server
  const health = await fetch(`${API.replace(/\/api\/v1\/?$/, "")}/health/services`);
  if (!ui.ok || !health.ok) throw new Error(`environment down: ui=${ui.status} api=${health.status}`);

  const children = (await api("GET", `${API}/parents/me/children`, await loginToken(...CREDS.parent))).json;
  if (!Array.isArray(children) || !children.length) throw new Error("parent has no children via /parents/me/children");
  // The UI defaults to the FIRST child returned by the API — expectations
  // follow that actual default rather than assuming a fixed student.
  const child = children[0];
  const studentId = Number(child.student_id);
  const childName = child.name;
  const studentIds = children.map((c) => Number(c.student_id));

  // Session-linked, published, present marks (the parent-results aggregate
  // is built only from session rows — repository.student_results).
  const [allObt, allPos] = q("schoolersdb_e2e",
    `select coalesce(sum(m.score),0) || ':' || coalesce(sum(m.max_marks),0) from marks m join examination_sessions es on es.session_id = m.examination_session_id join examinations e on e.exam_id = es.exam_id where m.student_id = ${studentId} and m.workflow_status = 'published' and m.is_withheld = false and m.assessment_status = 'present' and m.score is not null;`)
    .split(":").map(Number);
  const yearId = Number(q("schoolersdb_e2e", "select year_id from academic_years where name = '2026-27';"));
  const periodId = Number(q("schoolersdb_e2e", `select period_id from academic_periods where year_id = ${yearId} and name = 'Term 2';`));
  const targetYearId = Number(q("schoolersdb_e2e", "select year_id from academic_years where name = '2027-28';"));
  const [t2Obt, t2Pos] = q("schoolersdb_e2e",
    `select coalesce(sum(m.score),0) || ':' || coalesce(sum(m.max_marks),0) from marks m join examination_sessions es on es.session_id = m.examination_session_id join examinations e on e.exam_id = es.exam_id where m.student_id = ${studentId} and m.workflow_status = 'published' and m.is_withheld = false and m.assessment_status = 'present' and m.score is not null and e.year_id = ${yearId} and e.period_id = ${periodId};`)
    .split(":").map(Number);

  const session19 = Number(q("schoolersdb_e2e", "select session_id from examination_sessions where exam_id = 13 and date = '2026-12-20';"));
  const engSession = Number(q("schoolersdb_e2e",
    `select m.examination_session_id from marks m where m.student_id = ${studentId} and m.workflow_status = 'published' and m.examination_session_id in (select session_id from examination_sessions where exam_id = 14);`));
  const engCell = q("schoolersdb_e2e",
    `select m.score || '/' || m.max_marks from marks m where m.student_id = ${studentId} and m.workflow_status = 'published' and m.examination_session_id = ${engSession};`);
  const engSubject = q("schoolersdb_e2e",
    `select sub.name from subjects sub join examination_sessions es on es.subject_id = sub.subject_id where es.session_id = ${engSession};`);
  const ssCell = q("schoolersdb_e2e",
    `select m.score || '/' || m.max_marks from marks m where m.student_id = ${studentId} and m.workflow_status = 'published' and m.examination_session_id = ${session19};`);
  const ssSubject = q("schoolersdb_e2e",
    `select sub.name from subjects sub join examination_sessions es on es.subject_id = sub.subject_id where es.session_id = ${session19};`);
  const [engScore, engMax] = engCell.split("/").map(Number);
  const [ssScore, ssMax] = ssCell.split("/").map(Number);
  const engPct = round2((engScore / engMax) * 100);
  const ssPct = round2((ssScore / ssMax) * 100);
  const allPct = round2((allObt / allPos) * 100);
  const t2Pct = round2((t2Obt / t2Pos) * 100);

  // Pinned grade bands (school 1 scale) — no thresholds invented in the test.
  const bands = q("schoolersdb_e2e",
    "select label || ':' || min_score || '-' || max_score from grade_levels where scale_id = 9 and min_score is not null and max_score is not null order by rank;")
    .split("\n").filter(Boolean).map((row) => {
      const [label, range] = row.split(":");
      const [min, max] = range.split("-").map(Number);
      return { label, min, max };
    });
  const labelFor = (pct) => bands.find((b) => b.min <= pct && pct <= b.max)?.label ?? null;
  const engGrade = labelFor(engPct);
  const ssGrade = labelFor(ssPct);

  const incompleteVisible = Number(q("schoolersdb_e2e",
    `select count(*) from marks where student_id in (${studentIds.join(",")}) and workflow_status = 'published' and is_withheld = false and assessment_status <> 'present';`));

  const batchesBefore = Number(q("schoolersdb_e2e", "select count(*) from promotion_batches;"));
  const enrollBefore = Number(q("schoolersdb_e2e", "select count(*) from class_enrollments;"));

  const teacherToken = await loginToken(...CREDS.teacher);
  const parentToken = await loginToken(...CREDS.parent);
  const adminToken = await loginToken(...CREDS.admin);

  console.log(`  child: ${childName} (id ${studentId}); expectations: overall ${allObt}/${allPos} ${allPct}%; Term2 ${t2Obt}/${t2Pos} ${t2Pct}%; ` +
    `eng ${engCell} ${engPct}% -> ${engGrade}; ss ${ssCell} ${ssPct}% -> ${ssGrade}; session19=${session19}; ` +
    `bands=${bands.map((b) => `${b.label}:${b.min}-${b.max}`).join(",")}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  page = await ctx.newPage();
  page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err).slice(0, 300)));

  // ---------- Check 2: unauthorized promotion -> 403, no writes ----------
  await step("check2: teacher promotion preview+commit return 403, no enrollment/batch writes", async () => {
    const preview = await api("POST", `${API}/promotions/preview`, teacherToken, { target_year_id: targetYearId });
    expectEq(preview.status, 403, "preview status");
    if (!String(preview.json?.detail ?? "").includes("Role 'teacher'")) {
      throw new Error(`preview detail is not an authorization denial: ${JSON.stringify(preview.json)}`);
    }
    const commit = await api("POST", `${API}/promotions/commit`, teacherToken, {
      target_year_id: targetYearId,
      assignments: [],
      idempotency_key: "e2e-gap-check-403",
    });
    expectEq(commit.status, 403, "commit status");
    if (!String(commit.json?.detail ?? "").includes("Role 'teacher'")) {
      throw new Error(`commit detail is not an authorization denial: ${JSON.stringify(commit.json)}`);
    }
    const batchesAfter = Number(q("schoolersdb_e2e", "select count(*) from promotion_batches;"));
    const enrollAfter = Number(q("schoolersdb_e2e", "select count(*) from class_enrollments;"));
    expectEq(batchesAfter, batchesBefore, "promotion_batches count unchanged");
    expectEq(enrollAfter, enrollBefore, "class_enrollments count unchanged");
    console.log(`  evidence: preview=${preview.status} commit=${commit.status} detail=${JSON.stringify(preview.json?.detail)}; batches ${batchesBefore}->${batchesAfter}, enrollments ${enrollBefore}->${enrollAfter}`);
  });

  // ---------- Check 1: CSV template download ----------
  await step("check1: Template CSV download — filename, headers, one row per active class student", async () => {
    await login(...CREDS.admin);
    await page.goto(`${BASE}/admin/marks-entry`);
    await pick("Examination", "Half-Yearly · draft");
    await pickSessionByDate("2026-12-20");
    // Session19 marks are published → the grid renders read-only rows
    // ("present · published · n/m") instead of score inputs.
    const gridRow = page.locator(".listitem").filter({ hasText: "Aadhya Rao" }).first();
    await gridRow.waitFor({ timeout: 8000 });
    if (!((await gridRow.innerText()).includes("published"))) {
      throw new Error(`session grid row not in published state: ${await gridRow.innerText()}`);
    }

    const dlPromise = page.waitForEvent("download", { timeout: 15000 });
    const toastPromise = toastWatcher("Template downloaded", 10000);
    await page.getByRole("button", { name: "Template CSV", exact: true }).click();
    const download = await dlPromise;
    await toastPromise;
    const filename = download.suggestedFilename();
    expectEq(filename, `marks-session-${session19}-template.csv`, "download filename");
    const filePath = await download.path();
    if (!filePath) throw new Error("download has no accessible file path");
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.trim().split(/\r?\n/);
    expectEq(lines[0], "student_id,admission_no,student_name,score_or_grade,assessment_status", "template headers");
    const activeClassStudents = Number(q("schoolersdb_e2e", "select count(*) from students where class_id = 1 and is_active = true;"));
    expectEq(lines.length - 1, activeClassStudents, "template data row count (active class students)");
    for (const row of lines.slice(1)) {
      if (!/^\d+,BH-\d+,[^,]+,,present$/.test(row)) throw new Error(`unexpected template row: ${row}`);
    }
    const apiText = (await api("GET", `${API}/marks/import/template?session_id=${session19}`, adminToken)).text;
    expectEq(apiText.replace(/\r\n/g, "\n").trim(), content.replace(/\r\n/g, "\n").trim(), "UI download equals template API response");
    await shot("template-downloaded");
    console.log(`  evidence: filename=${filename}; headers OK; ${lines.length - 1} rows match ${activeClassStudents} active class students; matches API template endpoint`);
  });

  // ---------- Check 3: parent grade + percentage assertions ----------
  await step("check3: parent report card grade/percentage match fixture + API + school scale", async () => {
    const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    page = await ctx2.newPage();
    page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err).slice(0, 300)));
    await login(...CREDS.parent);
    await page.goto(`${BASE}/parent/marks`);
    await expectText(`${childName} · subject-wise marks`);

    // Overall (unfiltered): aggregate over session-linked published rows.
    await expectText(`${allObt}/${allPos} · ${allPct}%`, 10000);

    // Examination lines with independently computed grade letters
    // (grade span omitted by the UI when the scale has no matching band).
    const engLine = `Term 2 Weekly · ${engCell} (${engPct}%)${engGrade ? ` · Grade ${engGrade}` : ""}`;
    const ssLine = `Half-Yearly · ${ssCell} (${ssPct}%)${ssGrade ? ` · Grade ${ssGrade}` : ""}`;
    await expectText(new RegExp(esc(engLine)), 6000);
    await expectText(new RegExp(esc(ssLine)), 6000);

    // Subject rows: score + grade avatar + term label.
    const engRow = page.locator(".listitem").filter({ hasText: engSubject }).filter({ hasText: `${engCell} · ` }).first();
    await engRow.waitFor({ timeout: 6000 });
    if (!((await engRow.innerText()).includes(engSubject))) throw new Error(`row for ${engCell} is not ${engSubject}: ${await engRow.innerText()}`);
    const engAvatar = (await engRow.locator(".avatar").innerText()).trim();
    expectEq(engAvatar, engGrade ?? "–", "row grade avatar (subject with no band)");
    const ssRow = page.locator(".listitem").filter({ hasText: ssSubject }).filter({ hasText: `${ssCell} · ` }).first();
    await ssRow.waitFor({ timeout: 6000 });
    if (!((await ssRow.innerText()).includes(ssSubject))) throw new Error(`row for ${ssCell} is not ${ssSubject}: ${await ssRow.innerText()}`);
    const ssAvatar = (await ssRow.locator(".avatar").innerText()).trim();
    expectEq(ssAvatar, ssGrade ?? "–", "row grade avatar");

    // API ground truth as the parent, cross-checked against the DB calc.
    const unfiltered = (await api("GET", `${API}/marks/results/student/${studentId}`, parentToken)).json;
    const agg = unfiltered.aggregate;
    expectEq(`${agg.obtained}/${agg.possible}/${round2((agg.obtained / agg.possible) * 100)}`, `${allObt}/${allPos}/${allPct}`, "API aggregate == independent DB calc");
    expectEq(agg.incomplete, false, "API aggregate incomplete (unfiltered)");
    const e14 = unfiltered.examinations.find((e) => e.exam_id === 14);
    const e13 = unfiltered.examinations.find((e) => e.exam_id === 13);
    expectEq(`${e14.obtained}/${e14.possible} ${round2(e14.percentage)}% grade=${e14.grade?.label ?? "none"}`,
      `${engScore}/${engMax} ${engPct}% grade=${engGrade ?? "none"}`, "API Term 2 Weekly entry");
    expectEq(`${e13.obtained}/${e13.possible} ${round2(e13.percentage)}% grade=${e13.grade?.label ?? "none"}`,
      `${ssScore}/${ssMax} ${ssPct}% grade=${ssGrade ?? "none"}`, "API Half-Yearly entry");

    const filtered = (await api("GET", `${API}/marks/results/student/${studentId}?year_id=${yearId}&period_id=${periodId}`, parentToken)).json;
    expectEq(`${filtered.aggregate.obtained}/${filtered.aggregate.possible} ${round2(filtered.aggregate.percentage)}% incomplete=${filtered.aggregate.incomplete}`,
      `${t2Obt}/${t2Pos} ${t2Pct}% incomplete=false`, "API Term-2 aggregate == independent DB calc");
    expectEq(filtered.examinations.length, 1, "Term-2 scope exposes only exams in that period");
    expectEq(filtered.examinations[0].exam_id, 14, "Term-2 scope exam");

    // UI year+Term filter shows the same filtered aggregate.
    await pick("Filter results by academic year", "2026-27");
    await pick("Filter results by term", "Term 2");
    await expectText(`${t2Obt}/${t2Pos} · ${t2Pct}%`, 8000);

    // Incomplete indicator: fixture has no parent-visible incomplete rows.
    if (incompleteVisible !== 0) {
      throw new Error(`fixture expectation broken: ${incompleteVisible} parent-visible incomplete rows exist — assert the indicator`);
    }
    const bodyText = await page.locator("body").innerText();
    if (/Incomplete/i.test(bodyText)) throw new Error("'Incomplete' badge shown despite all rows present");

    await shot("parent-grade-percentage");
    console.log(`  evidence: UI '${allObt}/${allPos} · ${allPct}%', 'Term 2 Weekly · ${engCell} (${engPct}%) · Grade ${engGrade}', 'Half-Yearly · ${ssCell} (${ssPct}%) · Grade ${ssGrade}'; ` +
      `filtered UI '${t2Obt}/${t2Pos} · ${t2Pct}%'; API == DB calc; bands ${bands.map((b) => `${b.label} ${b.min}-${b.max}`).join(", ")}; ` +
      `incomplete N/A (0 parent-visible incomplete rows; unit coverage: test_marks_results.py incomplete tests)`);
  });

  await step("no uncaught page errors during gap checks", async () => {
    expectEq(pageErrors.length, 0, "page errors");
  });

  await browser.close();

  const summary = { pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
  fs.writeFileSync(path.join(WORK, "gap-results.json"), JSON.stringify({ results, summary }, null, 2));
  console.log("\n===== GAP CHECK SUMMARY =====");
  console.log(JSON.stringify(summary));
  console.log(`TOTAL ${summary.pass}/${results.length} passed`);
  process.exit(summary.fail ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(2);
});
