/**
 * E2E verification for the examinations flows (admin / teacher / parent)
 * against the isolated stack: UI http://localhost:5174 → API :8100 →
 * schoolersdb_e2e (school 1 flag ON, school 2 OFF).
 *
 * Run: node tests/e2e-examinations.mjs
 * Screenshots + results.json land in E2E_SHOTS (default /var/folders/.../e2e/shots).
 * Credentials come from env with local-dev defaults (same seed as the repo).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:5174";
const API = process.env.E2E_API ?? "http://localhost:8100/api/v1";
const API_A = process.env.E2E_API_A ?? "http://localhost:8000/api/v1";
const SHOTS = process.env.E2E_SHOTS
  ?? "/var/folders/zf/tv6w5m8x4k190vk6_c5qt4kw0000gp/T/opencode/e2e/shots";
const WORK = path.dirname(SHOTS);
const CSV = path.join(WORK, "session-marks.csv");
const PSQL = "/Applications/Postgres.app/Contents/Versions/17/bin/psql";

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
};
const CREDS = {
  admin: [process.env.E2E_ADMIN_USER ?? "blue.horizon", need("E2E_ADMIN_PASS")],
  teacher: [process.env.E2E_TEACHER_USER ?? "bh.teacher1", need("E2E_TEACHER_PASS")],
  parent: [process.env.E2E_PARENT_USER ?? "bh.parent1", need("E2E_PARENT_PASS")],
  gv: [process.env.E2E_GV_USER ?? "gv.teacher1", need("E2E_GV_PASS")],
};

const CSV_BODY = [
  "student_id,admission_no,student_name,score_or_grade,assessment_status",
  "1,BH-0001,Aadhya Rao,40,present",
  "7,BH-0007,Anaya Reddy,45,present",
  "13,BH-0013,Kiara Kapoor,48,present",
  "2,BH-0002,Aryan Nair,30,present", // wrong class → invalid
  "1,BH-0001,Aadhya Rao,49,present", // duplicate student → invalid
  "",
].join("\n");

const results = [];
const pageErrors = [];
let stepNo = 0;
let journey = "boot";
let page;

process.on("unhandledRejection", (err) => {
  console.log(`WARN  unhandled rejection (kept running): ${String(err?.message ?? err).slice(0, 200)}`);
});

const t = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function shot(label) {
  try {
    await page.screenshot({ path: path.join(SHOTS, `${String(stepNo).padStart(2, "0")}-${slug(label)}.png`), fullPage: true });
  } catch { /* page may be closed */ }
}

async function step(name, fn) {
  stepNo += 1;
  try {
    await fn();
    results.push({ journey, n: stepNo, name, ok: true });
    console.log(`PASS  [${journey}] ${stepNo} ${name}`);
  } catch (err) {
    const msg = String(err?.message ?? err).split("\n").slice(0, 6).join(" | ");
    results.push({ journey, n: stepNo, name, ok: false, err: msg });
    console.log(`FAIL  [${journey}] ${stepNo} ${name} :: ${msg}`);
    await shot(`${name}-FAIL`);
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
  // Case-insensitive: section-label elements are CSS-uppercased, and
  // innerText reflects the rendered (uppercase) text.
  const needle = want.toLowerCase();
  return page.waitForFunction(
    (x) => document.body.innerText.toLowerCase().includes(x), needle,
    { timeout: ms, polling: 200 },
  );
}

async function has(want, ms = 3000) {
  try {
    await expectText(want, ms);
    return true;
  } catch {
    return false;
  }
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
  throw new Error(`toast not seen (${String(want)}); observed so far: ${[...history].join(" || ") || "(none)"}`);
}

/** Start the toast watcher first, then run the action, then await the watcher. */
async function expectToast(want, action, ms = 8000) {
  const watcher = toastWatcher(want, ms);
  try {
    await action();
  } catch (err) {
    watcher.catch(() => { /* orphaned watcher must not crash the run */ });
    throw err;
  }
  return watcher;
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

async function assertPick(aria, want) {
  const trig = page.locator(`[data-select-trigger="true"][aria-label="${aria}"]`);
  await trig.waitFor({ state: "visible", timeout: 8000 });
  const txt = (await trig.innerText()).trim();
  if (!txt.includes(want)) throw new Error(`select "${aria}" shows "${txt}", want "${want}"`);
}

async function pickSessionByDate(date) {
  const trig = await openSelect("Session");
  const opt = page.getByRole("option").filter({ hasText: date });
  await opt.waitFor({ timeout: 8000 });
  await opt.click();
  await trig.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
  await assertPick("Session", date);
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
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, json };
}

async function loginToken(user, pass, base = API) {
  const r = await api("POST", `${base}/auth/login`, null, { username: user, password: pass });
  if (!r.json?.access_token) throw new Error(`login failed on ${base}: ${r.status}`);
  return r.json.access_token;
}

const q = (db, sql) => execSync(`${PSQL} -d ${db} -At -c '${sql}'`).toString().trim();

function expectEq(got, want, what) {
  if (got !== want) throw new Error(`${what}: got "${got}", want "${want}"`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(CSV, CSV_BODY);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  page = await ctx.newPage();
  page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err).slice(0, 300)));

  // ---------- boot ----------
  await step("vite dev server (5174) responds", async () => {
    const res = await fetch(BASE);
    expectEq(res.status, 200, "vite status");
  });
  await step("stack B gateway (8100) healthy; stack A gateway (8000) up", async () => {
    const b = await fetch(`${API}/auth/me`);
    if (![401, 403, 404, 200].includes(b.status)) throw new Error(`stack B status ${b.status}`);
    const a = await fetch(`${API_A}/auth/me`);
    if (![401, 403, 404, 200].includes(a.status)) throw new Error(`stack A status ${a.status}`);
  });
  await step("flags: source DB both OFF; e2e clone school1 ON / school2 OFF", async () => {
    expectEq(q("schoolersdb", "select examinations_enabled from schools where school_id in (1,2) order by school_id;"), "f\nf", "source flags");
    expectEq(q("schoolersdb_e2e", "select examinations_enabled from schools where school_id in (1,2) order by school_id;"), "t\nf", "e2e flags");
  });
  const legacyBefore = q(
    "schoolersdb_e2e",
    "select mark_id || chr(58) || term || chr(61) || coalesce(score::text, assessment_status) from marks where examination_session_id is null order by mark_id;",
  );

  const adminTok = await loginToken(...CREDS.admin);
  await step("ensure promotion target year 2027-28 exists", async () => {
    const years = (await api("GET", `${API}/academic-years`, adminTok)).json;
    const list = Array.isArray(years) ? years : [];
    if (!list.some((y) => y.name === "2027-28")) {
      const r = await api("POST", `${API}/academic-years`, adminTok, {
        name: "2027-28", start_date: "2027-06-01", end_date: "2028-05-31",
      });
      if (r.status >= 300) throw new Error(`year create failed: ${r.status}`);
    }
  });
  let clsName = "Grade I";
  let subj5Name = "Science";
  let subj1Name = "Mathematics";
  let subj2Name = "English";
  await step("fetch class/subject labels for selectors", async () => {
    const classes = (await api("GET", `${API}/classes`, adminTok)).json;
    const list = Array.isArray(classes) ? classes : classes?.items ?? [];
    clsName = list.find((c) => c.class_id === 1)?.name ?? clsName;
    const subjects = (await api("GET", `${API}/subjects`, adminTok)).json;
    const slist = Array.isArray(subjects) ? subjects : subjects?.items ?? [];
    subj1Name = slist.find((s) => s.subject_id === 1)?.name ?? subj1Name;
    subj2Name = slist.find((s) => s.subject_id === 2)?.name ?? subj2Name;
    subj5Name = slist.find((s) => s.subject_id === 5)?.name ?? subj5Name;
    if (!clsName || !subj5Name) throw new Error("could not resolve class/subject labels");
  });

  // ---------- admin journey ----------
  journey = "admin";
  await step("admin login (blue.horizon) lands authenticated", async () => {
    await login(...CREDS.admin);
    if (page.url().includes("/login")) throw new Error("still on /login");
    await shot("admin-logged-in");
  });

  await step("examinations: year filter shows draft + published exams", async () => {
    await page.goto(`${BASE}/admin/examinations`);
    await expectText("Examinations");
    await pick("Filter by year", "2026-27");
    await assertPick("Filter by year", "2026-27");
    await expectText("Half-Yearly");
    await expectText("Term 2 Weekly");
    await shot("admin-exams-list");
  });

  const sessCard = () => page.locator(".card").filter({ hasText: "Sessions in Half-Yearly" });
  const row15 = () => sessCard().locator(".listitem").filter({ hasText: "2026-12-15" });

  await step("expand Half-Yearly sessions (12-15 + 12-18 visible)", async () => {
    const examRow = page.locator(".listitem").filter({ hasText: "Half-Yearly" }).first();
    await examRow.getByRole("button", { name: "Sessions" }).click();
    await sessCard().getByText("2026-12-15").first().waitFor({ timeout: 6000 });
    await sessCard().getByText("2026-12-18").first().waitFor({ timeout: 6000 });
  });

  await step("session edit validation: empty max marks refused client-side", async () => {
    await row15().getByRole("button", { name: "Edit" }).click();
    const editForm = page.locator('form:has([aria-label="Edit class"])');
    await editForm.waitFor({ timeout: 4000 });
    const max = editForm.locator('input[type="number"]');
    await max.fill("");
    await expectToast(
      "Max marks must be a positive number",
      () => editForm.getByRole("button", { name: "Save changes" }).click(),
    );
  });

  await step("session edit saves max marks 100→90 (draft, no reason needed)", async () => {
    const editForm = page.locator('form:has([aria-label="Edit class"])');
    await editForm.locator('input[type="number"]').fill("90");
    await expectToast(
      "Session updated",
      () => editForm.getByRole("button", { name: "Save changes" }).click(),
    );
    await expectText(/2026-12-15[\s\S]{0,160}max 90/);
    await shot("admin-session-edited");
  });

  await step("History panel opens for draft session (no error; draft edits unversioned by design)", async () => {
    await row15().getByRole("button", { name: "History" }).click();
    await expectText(/Amendment history/i, 6000);
    const card = page.locator(".card").filter({ hasText: /Amendment history/i }).first();
    const txt = await card.innerText();
    if (!/No amendments recorded|edited|added/i.test(txt)) {
      throw new Error(`unexpected versions content: ${txt.slice(0, 200)}`);
    }
    const banners = await card.locator(".error-banner").count();
    if (banners > 0) throw new Error(`versions error banner shown: ${txt.slice(0, 200)}`);
  });

  await step("published schedule: reason required, amendment lands in History", async () => {
    const examRow14 = page.locator(".listitem").filter({ hasText: "Term 2 Weekly" }).first();
    await examRow14.getByRole("button", { name: "Sessions" }).click();
    const card14 = page.locator(".card").filter({ hasText: "Sessions in Term 2 Weekly" });
    const row16 = card14.locator(".listitem").filter({ hasText: "2026-12-16" });
    await row16.getByRole("button", { name: "Edit" }).click();
    const editForm = page.locator('form:has([aria-label="Edit class"])');
    await editForm.waitFor({ timeout: 4000 });
    await editForm.locator('label:has-text("Venue") ~ input').fill("Hall B");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expectText("A reason is required to amend a published schedule", 5000);
    await editForm.getByPlaceholder("Why is this change?").fill("E2E venue move");
    await expectToast(
      "Session updated",
      () => editForm.getByRole("button", { name: "Save changes" }).click(),
    );
    await row16.getByRole("button", { name: "History" }).click();
    await expectText(/Amendment history/i, 6000);
    await expectText(/edited\s*·\s*E2E venue move/i, 6000);
    await shot("admin-published-amendment-history");
  });

  await step("add-session validation: incomplete draft refused", async () => {
    // step12 left openExam on Term 2 Weekly (published); switch back to the
    // draft exam so the add form is draft-mode (no reason required).
    const examRow13 = page.locator(".listitem").filter({ hasText: "Half-Yearly" }).first();
    const sessionsBtn = examRow13.getByRole("button", { name: "Sessions" });
    if (await sessionsBtn.count()) await sessionsBtn.click();
    const addForm = page.locator('form:has([aria-label="Class"])');
    await addForm.waitFor({ timeout: 4000 });
    await expectToast(
      "Choose a class, subject, date, and times",
      () => addForm.getByRole("button", { name: "Add session" }).click(),
    );
  });

  let newSessionDate = "2026-12-20";
  await step(`add fresh session (${newSessionDate}, ${clsName}/${subj5Name}, max 50)`, async () => {
    const addForm = page.locator('form:has([aria-label="Class"])');
    await pick("Class", clsName);
    await pick("Subject", subj5Name);
    await addForm.locator('[aria-label="Session date"]').fill(newSessionDate);
    const times = addForm.locator('input[type="time"]');
    await times.nth(0).fill("10:00");
    await times.nth(1).fill("12:00");
    await addForm.locator('input[type="number"]').fill("50");
    await expectToast(
      "Session scheduled",
      () => addForm.getByRole("button", { name: "Add session" }).click(),
    );
    await expectText(newSessionDate, 8000);
    const card = await sessCard().innerText();
    if (!new RegExp(`${newSessionDate}[\\s\\S]{0,200}max 50`).test(card)) {
      throw new Error(`new session row missing max 50: ${card.slice(0, 300)}`);
    }
    await shot("admin-session-added");
  });

  await step("marks entry: select exam + fresh session, grid shows 3 students", async () => {
    await page.goto(`${BASE}/admin/marks-entry`);
    await pick("Examination", "Half-Yearly · draft");
    await pickSessionByDate(newSessionDate);
    for (const name of ["Aadhya Rao", "Anaya Reddy", "Kiara Kapoor"]) {
      await page.locator(`[aria-label="Mark for ${name}"]`).first().waitFor({ timeout: 8000 });
    }
    await shot("admin-marks-grid");
  });

  await step("CSV preview: 3 valid, 2 invalid; commit blocked until partial opt-in", async () => {
    await page.locator('input[type="file"]').setInputFiles(CSV);
    await expectText("Import preview · batch #", 10000);
    await expectText("3 valid, 2 invalid");
    await expectText("2 invalid row(s)");
    const commit = page.getByRole("button", { name: "Commit", exact: true });
    await commit.waitFor({ timeout: 4000 });
    if (!(await commit.isDisabled())) throw new Error("Commit enabled despite invalid rows without partial");
    await shot("admin-csv-preview");
  });

  await step("partial commit applies 3 valid, skips 2 invalid (receipt shown)", async () => {
    const cb = page.locator('label:has-text("Apply valid rows only") input[type="checkbox"]');
    await cb.check();
    const commit = page.getByRole("button", { name: "Commit", exact: true });
    await expectToast("Import applied: 3 row(s)", async () => {
      await commit.click();
      const dlg = page.locator(".confirm-box");
      await dlg.waitFor({ timeout: 4000 });
      await dlg.getByRole("button", { name: "Commit" }).click();
    });
    await expectText("Applied 3");
    await expectText("skipped 2");
    await shot("admin-csv-committed");
  });

  await step("manual draft edit (Aadhya 40→42) → Draft updated", async () => {
    const cell = page.locator('[aria-label="Mark for Aadhya Rao"]').first();
    await cell.waitFor({ timeout: 6000 });
    await cell.fill("42");
    await expectToast("Draft updated", () => cell.press("Tab"));
  });

  await step("submit session: 3 submitted, every student has an entry", async () => {
    await expectToast(
      "Submitted 3 draft(s) for review",
      () => page.getByRole("button", { name: "Submit session" }).click(),
    );
    await expectText("every student has an entry");
  });

  await step("publish session (admin)", async () => {
    await expectToast(
      "Published",
      () => page.getByRole("button", { name: "Publish", exact: true }).click(),
    );
  });

  await step("reload: published marks persist (42/45/48 of 50), inputs gone", async () => {
    await page.reload();
    await pick("Examination", "Half-Yearly · draft");
    await pickSessionByDate(newSessionDate);
    await expectText("present · published · 42/50");
    await expectText("present · published · 45/50");
    await expectText("present · published · 48/50");
    const inputs = await page.locator('[aria-label="Mark for Aadhya Rao"]').count();
    if (inputs > 0) throw new Error("published row still shows an editable input");
    await shot("admin-published-persisted");
  });

  await step("CSV re-upload is idempotent (already processed, no rewrite)", async () => {
    await page.locator('input[type="file"]').setInputFiles(CSV);
    await expectText("already processed", 10000);
    await shot("admin-csv-idempotent");
  });

  await step("results by examination: published totals render", async () => {
    await page.goto(`${BASE}/admin/exam-results`);
    await pick("Examination", "Term 2 Weekly · published");
    await expectText("Student #1");
    await expectText("72/100 (72%)");
    await shot("admin-results-grid");
  });

  await step("results 422 lookup: flattened toast, page alive, no pageerror", async () => {
    const before = pageErrors.length;
    await page.getByPlaceholder("e.g. 12").fill("abc");
    await expectToast(
      "Input should be a valid integer",
      () => page.getByRole("button", { name: "Look up" }).click(),
    );
    const alive = await page.locator('[data-select-trigger="true"][aria-label="Examination"]').count();
    if (!alive) throw new Error("page crashed after 422 (examination select gone)");
    if (pageErrors.length > before) throw new Error(`pageerror after 422: ${pageErrors.at(-1)}`);
    await shot("admin-results-422");
  });

  await step("results by student: lookup id 13 shows Term 2 Weekly 50/100", async () => {
    await page.getByPlaceholder("e.g. 12").fill("13");
    await page.getByRole("button", { name: "Look up" }).click();
    await expectText("Term 2 Weekly");
    await expectText("50/100");
  });

  await step("promotion: preview founding-year reconciliation for 2027-28", async () => {
    await page.goto(`${BASE}/admin/promotion`);
    await pick("Target year", "2027-28");
    await expectToast(/Preview ready: \d+ proposed/, () => page.getByRole("button", { name: "Preview" }).click());
    await expectText(/Proposed \(\d+\)/);
    await expectText("enrolled");
    await shot("admin-promotion-preview");
  });

  await step("promotion commit transactionally; batch survives reload", async () => {
    await expectToast(
      "Promotion committed transactionally",
      () => page.getByRole("button", { name: "Commit promotion" }).click(),
    );
    await page.reload();
    await expectText("Batches");
    if (await has("No promotions yet.", 2500)) throw new Error("no batch listed after commit");
    const batches = q("schoolersdb_e2e", "select count(*) from promotion_batches;");
    const enrollments = q("schoolersdb_e2e", "select count(*) from class_enrollments where academic_year_id=15;");
    if (Number(batches) < 1) throw new Error("promotion_batches empty in DB");
    if (Number(enrollments) < 1) throw new Error("no 2027-28 enrollments in DB");
    await shot("admin-promotion-batches");
  });

  // ---------- teacher journey ----------
  journey = "teacher";
  await step("teacher login; legacy term grid renders (no error banner)", async () => {
    await login(...CREDS.teacher);
    await page.goto(`${BASE}/teacher/marks`);
    await expectText("Aadhya Rao");
    await expectText(subj1Name);
    const banners = await page.locator(".error-banner").count();
    if (banners > 0) throw new Error("error banner on legacy grid");
    await shot("teacher-legacy-grid");
  });

  await step("session mode: exam13 offers only the teacher's session (no 12-18)", async () => {
    await page.getByRole("button", { name: "Examination sessions" }).click();
    await pick("Examination", "Half-Yearly · draft");
    const trig = await openSelect("Session");
    const texts = await page.getByRole("option").allInnerTexts();
    const joined = texts.join(" | ");
    if (!texts.some((x) => x.includes("2026-12-15"))) throw new Error(`own session missing: ${joined}`);
    if (texts.some((x) => x.includes("2026-12-18"))) throw new Error(`other teacher's session exposed: ${joined}`);
    const opt = page.getByRole("option").filter({ hasText: "2026-12-15" });
    await opt.click();
    await trig.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
    await shot("teacher-session-filtered");
  });

  await step("teacher edits a draft cell (Kiara exempt→66 present)", async () => {
    const cell = page.locator('[aria-label="Mark for Kiara Kapoor"]').first();
    await cell.waitFor({ timeout: 8000 });
    await cell.fill("66");
    await expectToast("Draft updated", () => cell.press("Tab"));
    await expectText("present · draft");
    await shot("teacher-draft-edited");
  });

  await step("teacher submit works; publish control absent for teacher", async () => {
    await expectToast(/^Submitted/, () => page.getByRole("button", { name: "Submit session" }).click());
    const publish = await page.getByRole("button", { name: "Publish", exact: true }).count();
    if (publish > 0) throw new Error("teacher UI exposes a Publish button");
  });

  await step("exam14 (other subjects): empty state, no sessions exposed", async () => {
    await pick("Examination", "Term 2 Weekly · published");
    await expectText("No sessions for your classes in this examination.");
    await shot("teacher-empty-other-exam");
  });

  // ---------- parent journey ----------
  journey = "parent";
  await step("parent login; report card shows rows with Term 2 labels", async () => {
    await login(...CREDS.parent);
    await page.goto(`${BASE}/parent/marks`);
    await expectText("Report Card");
    await expectText("· subject-wise marks");
    await expectText("· Term 2");
    await expectText(subj2Name);
    await expectText(/\d+\/\d+ · \d/); // overall aggregate
    await shot("parent-marks");
  });

  await step("year+Term 1 filter: no-exams state + Clear filters (lockout fix)", async () => {
    await pick("Filter results by academic year", "2026-27");
    await pick("Filter results by term", "Term 1");
    await expectText("No examinations match this selection.");
    await expectText("Clear filters");
    await shot("parent-lockout-fixed");
  });

  await step("Clear filters restores aggregate", async () => {
    await page.getByRole("button", { name: "Clear filters" }).click();
    await assertPick("Filter results by academic year", "All years");
    if (await has("No examinations match this selection.", 1500)) throw new Error("aggregate still empty after clear");
    await expectText(/\d+\/\d+ · \d/);
  });

  await step("Term 2 filter: Term 2 Weekly included in summary", async () => {
    await pick("Filter results by academic year", "2026-27");
    await pick("Filter results by term", "Term 2");
    await expectText("Term 2 Weekly");
    await expectText(/\d+\/\d+ · \d/);
  });

  await step("refresh: filters reset, data still present", async () => {
    await page.reload();
    await expectText("Report Card");
    await assertPick("Filter results by academic year", "All years");
    await expectText("· Term 2");
  });

  await step("parent report page loads without crash", async () => {
    await page.goto(`${BASE}/parent/report`);
    await expectText("My Report");
    await shot("parent-report");
  });

  // ---------- API integrity ----------
  journey = "api";
  await step("I1 cross-school teacher load → 403", async () => {
    const tok = await loginToken(...CREDS.gv);
    const r = await api("GET", `${API}/teachers/1/load`, tok);
    expectEq(r.status, 403, "gv load status");
  });
  await step("I2 school-2 flag OFF: gv examinations → 403", async () => {
    const tok = await loginToken(...CREDS.gv);
    const r = await api("GET", `${API}/examinations`, tok);
    expectEq(r.status, 403, "gv exams status");
  });
  await step("I3 teacher publish attempt → 403 role", async () => {
    const tok = await loginToken(...CREDS.teacher);
    const r = await api("POST", `${API}/marks/sessions/16/publish`, tok);
    expectEq(r.status, 403, "teacher publish status");
  });
  await step("I4 stack A (flag OFF): exams 403, legacy marks still 200", async () => {
    const tok = await loginToken(...CREDS.admin, API_A);
    const exams = await api("GET", `${API_A}/examinations`, tok);
    expectEq(exams.status, 403, "stack A exams status");
    const marks = await api("GET", `${API_A}/marks/student/1`, tok);
    expectEq(marks.status, 200, "stack A legacy marks status");
  });
  await step("I5 legacy subject marks untouched (snapshot from boot unchanged)", async () => {
    const rows = q(
      "schoolersdb_e2e",
      "select mark_id || chr(58) || term || chr(61) || coalesce(score::text, assessment_status) from marks where examination_session_id is null order by mark_id;",
    );
    expectEq(rows, legacyBefore, "legacy rows vs boot snapshot");
  });
  await step("I6 source DB flags still OFF after entire run", async () => {
    expectEq(q("schoolersdb", "select examinations_enabled from schools where school_id in (1,2) order by school_id;"), "f\nf", "source flags after run");
    expectEq(q("schoolersdb_e2e", "select examinations_enabled from schools where school_id in (1,2) order by school_id;"), "t\nf", "e2e flags after run");
  });

  await step("zero uncaught page errors across all journeys", async () => {
    if (pageErrors.length) throw new Error(`${pageErrors.length} pageerror(s): ${pageErrors.slice(0, 3).join(" | ")}`);
  });

  // ---------- summary ----------
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const byJourney = {};
  for (const r of results) {
    byJourney[r.journey] ??= { pass: 0, fail: 0 };
    if (r.ok) byJourney[r.journey].pass += 1;
    else byJourney[r.journey].fail += 1;
  }
  fs.writeFileSync(path.join(SHOTS, "..", "results.json"), JSON.stringify({ byJourney, results, pageErrors }, null, 2));
  console.log("\n===== E2E SUMMARY =====");
  console.log(JSON.stringify(byJourney));
  console.log(`TOTAL ${passed}/${results.length} passed`);
  for (const f of failed) console.log(`  FAIL [${f.journey}] ${f.n} ${f.name} — ${f.err}`);

  await browser.close();
}

main().catch((err) => {
  console.error("E2E runner crashed:", err);
  process.exit(2);
});
