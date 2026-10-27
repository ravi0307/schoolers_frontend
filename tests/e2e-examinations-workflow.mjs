/**
 * E2E verification of the simple end-to-end examination workflow against
 * the isolated stack (UI http://localhost:5174 → API :8100 →
 * schoolersdb_e2e, school 1 flag ON).
 *
 * Full chain, all through the real UI (API/DB used only for verification):
 *   1. Admin creates an examination + schedules a session; a duplicate
 *      class/date/time conflicts with a published exam and is refused
 *      with an understandable error.
 *   2. Teacher enters marks (invalid >max refused), submits incomplete —
 *      missing students are named.
 *   3. Admin completes the missing mark and publishes.
 *   4. Parent sees the examination schedule and the child's published
 *      results (score, percentage, grade); both persist across refresh.
 *   5. Admin promotes one student individually to next year; history shows
 *      the batch; re-promoting the same student is refused; everything
 *      persists across refresh.
 *
 * Run: node tests/e2e-examinations-workflow.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:5174";
const API = process.env.E2E_API ?? "http://localhost:8100/api/v1";
const SHOTS = process.env.E2E_SHOTS
  ?? "/var/folders/zf/tv6w5m8x4k190vk6_c5qt4kw0000gp/T/opencode/e2e/shots";

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

const EXAM_NAME = "Maths Revision Test";
const SESSION_DATE = "2026-12-19"; // inside Term 2, free for class 1
const CONFLICT_DATE = "2026-12-16"; // class 1 busy (published Term 2 Weekly)
const MARKS = { aadhya: "44", anaya: "48", kiara: "39" };
const MAX = "50";

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
    await page.screenshot({ path: path.join(SHOTS, `w${String(stepNo).padStart(2, "0")}-${slug(label)}.png`), fullPage: true });
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
  const needle = want.toLowerCase();
  return page.waitForFunction(
    (x) => document.body.innerText.toLowerCase().includes(x), needle,
    { timeout: ms, polling: 200 },
  );
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
  const trig = page.locator(`[data-select-trigger="true"][aria-label="${aria}"]:not([disabled])`);
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

async function loginToken(user, pass) {
  const r = await api("POST", `${API}/auth/login`, null, { username: user, password: pass });
  if (!r.json?.access_token) throw new Error(`login failed: ${r.status}`);
  return r.json.access_token;
}

function expectEq(got, want, what) {
  if (got !== want) throw new Error(`${what}: got "${got}", want "${want}"`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  page = await ctx.newPage();
  page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err).slice(0, 300)));

  const adminTok = await loginToken(...CREDS.admin);

  // ---------- boot ----------
  await step("stack up: vite 5174 + gateway 8100 healthy", async () => {
    const v = await fetch(BASE);
    expectEq(v.status, 200, "vite status");
    const h = await fetch("http://localhost:8100/health/services");
    const j = await h.json();
    const down = Object.entries(j).filter(([, s]) => s.status !== "up").map(([k]) => k);
    if (down.length) throw new Error(`services down: ${down.join(",")}`);
  });
  await step("flags: source DB f/f; e2e school1 ON school2 OFF", async () => {
    // verified via API: school2 (flag OFF) cannot read examinations
    const gvTokR = await api("POST", `${API}/auth/login`, null, { username: CREDS.gv[0], password: CREDS.gv[1] });
    const gv = gvTokR.json?.access_token;
    const r = await api("GET", `${API}/examinations`, gv);
    expectEq(r.status, 403, "school2 examinations status");
  });
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
  let destClassName = "Grade II";
  let subj1Name = "Mathematics";
  let examId = null;
  await step("resolve labels (class, subject, destination)", async () => {
    const classes = (await api("GET", `${API}/classes`, adminTok)).json;
    const list = Array.isArray(classes) ? classes : classes?.items ?? [];
    clsName = list.find((c) => c.class_id === 1)?.name ?? clsName;
    destClassName = list.find((c) => c.class_id === 2)?.name ?? destClassName;
    const subjects = (await api("GET", `${API}/subjects`, adminTok)).json;
    const slist = Array.isArray(subjects) ? subjects : subjects?.items ?? [];
    subj1Name = slist.find((s) => s.subject_id === 1)?.name ?? subj1Name;
  });

  // ---------- 1. admin creates examination + schedule ----------
  journey = "admin-create";
  await step("admin login lands on dashboard", async () => {
    await login(...CREDS.admin);
    if (page.url().includes("/login")) throw new Error("still on /login");
  });
  await step(`create draft exam "${EXAM_NAME}" (Half-Yearly · 2026-27 · Term 2)`, async () => {
    await page.goto(`${BASE}/admin/examinations`);
    await expectText("New examination (saved as draft)");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Create draft" }) });
    await form.locator("label:has-text(\"Name\") ~ input").fill(EXAM_NAME);
    await pick("Examination type", "Half-Yearly (max 100)");
    await pick("Academic year", "2026-27");
    await pick("Academic term", "Term 2");
    await expectToast(
      "Draft examination created",
      () => form.getByRole("button", { name: "Create draft" }).click(),
    );
    await expectText(EXAM_NAME);
    await shot("admin-exam-created");
  });
  await step("expand sessions of new exam; add form present, list empty", async () => {
    const examRow = page.locator(".listitem").filter({ hasText: EXAM_NAME }).first();
    await examRow.getByRole("button", { name: "Sessions" }).click();
    const addForm = page.locator('form:has([aria-label="Class"])');
    await addForm.waitFor({ timeout: 6000 });
  });
  await step(`schedule session (${clsName}/${subj1Name}, ${SESSION_DATE} 09:00-11:00, Hall A, max ${MAX})`, async () => {
    const addForm = page.locator('form:has([aria-label="Class"])');
    await pick("Class", clsName);
    await pick("Subject", subj1Name);
    await addForm.locator('[aria-label="Session date"]').fill(SESSION_DATE);
    const times = addForm.locator('input[type="time"]');
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("11:00");
    await addForm.locator('label:has-text("Venue") ~ input').fill("Hall A");
    await addForm.locator('input[type="number"]').fill(MAX);
    await expectToast(
      "Session scheduled",
      () => addForm.getByRole("button", { name: "Add session" }).click(),
    );
    const card = page.locator(".card").filter({ hasText: `Sessions in ${EXAM_NAME}` });
    await card.getByText(SESSION_DATE).first().waitFor({ timeout: 8000 });
    const txt = await card.innerText();
    if (!new RegExp(`${SESSION_DATE}[\\s\\S]{0,200}max ${MAX}`).test(txt)) {
      throw new Error(`session row missing max ${MAX}: ${txt.slice(0, 300)}`);
    }
    await shot("admin-session-scheduled");
  });
  await step(`duplicate class+time (${CONFLICT_DATE} 09:00-12:00) refused with understandable conflict`, async () => {
    const addForm = page.locator('form:has([aria-label="Class"])');
    await pick("Class", clsName);
    await pick("Subject", "English");
    await addForm.locator('[aria-label="Session date"]').fill(CONFLICT_DATE);
    const times = addForm.locator('input[type="time"]');
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("12:00");
    await expectToast(
      /already scheduled/i,
      () => addForm.getByRole("button", { name: "Add session" }).click(),
    );
    const card = page.locator(".card").filter({ hasText: `Sessions in ${EXAM_NAME}` });
    const txt = await card.innerText();
    if (txt.includes(CONFLICT_DATE)) throw new Error(`conflicting session was created: ${txt.slice(0, 300)}`);
    await shot("admin-conflict-refused");
  });
  await step("API verifies: exam draft; timetable has 12-19 session (max 50), no extra 12-16 row", async () => {
    const exams = (await api("GET", `${API}/examinations?year_id=14`, adminTok)).json;
    const list = Array.isArray(exams) ? exams : exams?.items ?? [];
    const exam = list.find((e) => e.name === EXAM_NAME);
    if (!exam) throw new Error(`exam not found via API: ${JSON.stringify(list.map((e) => e.name))}`);
    expectEq(exam.status, "draft", "exam status");
    examId = exam.exam_id;
    const tt = (await api("GET", `${API}/examinations/timetable?class_id=1`, adminTok)).json;
    const mine = tt.filter((s) => s.exam_name === EXAM_NAME);
    expectEq(mine.length, 1, "sessions of new exam for class 1");
    expectEq(mine[0].date, SESSION_DATE, "session date");
    expectEq(String(mine[0].max_marks), MAX, "session max");
    expectEq(mine[0].subject_name, subj1Name, "session subject");
  });

  // ---------- 2. teacher enters + submits ----------
  journey = "teacher";
  await step("teacher opens examination sessions; new session listed", async () => {
    await login(...CREDS.teacher);
    await page.goto(`${BASE}/teacher/marks`);
    await page.getByRole("button", { name: "Examination sessions" }).click();
    await pick("Examination", `${EXAM_NAME} · draft`);
    await pickSessionByDate(SESSION_DATE);
    for (const name of ["Aadhya Rao", "Anaya Reddy", "Kiara Kapoor"]) {
      await page.locator(`[aria-label="Mark for ${name}"]`).first().waitFor({ timeout: 8000 });
    }
    await shot("teacher-session-grid");
  });
  await step(`invalid mark (>max ${MAX}) refused with clear message`, async () => {
    const cell = page.locator('[aria-label="Mark for Aadhya Rao"]').first();
    await cell.fill("550");
    await expectToast(
      `Score must be between 0 and ${MAX}`,
      () => cell.press("Tab"),
    );
  });
  await step("enter 2 of 3 marks; submit names the missing student", async () => {
    const a = page.locator('[aria-label="Mark for Aadhya Rao"]').first();
    await a.fill(MARKS.aadhya);
    await expectToast(/Draft (updated|saved)/, () => a.press("Tab"));
    const n = page.locator('[aria-label="Mark for Anaya Reddy"]').first();
    await n.fill(MARKS.anaya);
    await expectToast(/Draft (updated|saved)/, () => n.press("Tab"));
    await expectToast(
      /^Submitted.*missing.*Kiara Kapoor|Submitted · missing: 13/,
      () => page.getByRole("button", { name: "Submit session" }).click(),
      10000,
    );
    const publish = await page.getByRole("button", { name: "Publish", exact: true }).count();
    if (publish > 0) throw new Error("teacher UI exposes a Publish button");
    await shot("teacher-submit-missing");
  });
  await step("API verifies 2 submitted rows (44, 48); Kiara missing", async () => {
    const er = (await api("GET", `${API}/marks/results/examination/${examId}?view=entry`, adminTok)).json;
    const rowFor = (id) => er.results.find((r) => r.student_id === id);
    const aadhya = rowFor(1);
    const anaya = rowFor(7);
    if (!aadhya || !anaya) throw new Error("expected submitted rows for students 1 and 7");
    const sessRow = (r) => r.subjects.find((m) => m.examination_session_id != null && r.subjects.indexOf(m) >= 0);
    expectEq(String(aadhya.subjects[0]?.score), MARKS.aadhya, "Aadhya score");
    expectEq(aadhya.subjects[0]?.workflow_status, "submitted", "Aadhya workflow");
    expectEq(String(anaya.subjects[0]?.score), MARKS.anaya, "Anaya score");
    if (!er.missing_student_ids.includes(13)) throw new Error(`Kiara not in missing list: ${JSON.stringify(er.missing_student_ids)}`);
    if (rowFor(13)) throw new Error("Kiara has a mark row before admin completion");
    void sessRow;
  });

  // ---------- 3. admin completes + publishes ----------
  journey = "admin-publish";
  await step("admin opens marks entry; submitted rows shown, Kiara editable", async () => {
    await login(...CREDS.admin);
    await page.goto(`${BASE}/admin/marks-entry`);
    await pick("Examination", `${EXAM_NAME} · draft`);
    await pickSessionByDate(SESSION_DATE);
    await expectText(`present · submitted · ${MARKS.aadhya}/${MAX}`);
    const kCell = page.locator('[aria-label="Mark for Kiara Kapoor"]').first();
    await kCell.waitFor({ timeout: 8000 });
    if (!(await kCell.isEditable())) throw new Error("Kiara cell not editable for admin");
    await shot("admin-marks-complete");
  });
  await step(`admin completes Kiara ${MARKS.kiara} and publishes`, async () => {
    const kCell = page.locator('[aria-label="Mark for Kiara Kapoor"]').first();
    await kCell.fill(MARKS.kiara);
    await expectToast(/Draft (updated|saved)/, () => kCell.press("Tab"));
    await expectToast(
      /Submitted \d+ draft\(s\) for review/,
      () => page.getByRole("button", { name: "Submit session" }).click(),
    );
    await expectText("every student has an entry"); // rendered banner, not a toast
    await expectToast(
      "Published",
      () => page.getByRole("button", { name: "Publish", exact: true }).click(),
    );
    await shot("admin-published");
  });
  await step("reload: published rows persist, editable inputs gone", async () => {
    await page.reload();
    await pick("Examination", `${EXAM_NAME} · draft`);
    await pickSessionByDate(SESSION_DATE);
    await expectText(`present · published · ${MARKS.aadhya}/${MAX}`);
    await expectText(`present · published · ${MARKS.anaya}/${MAX}`);
    await expectText(`present · published · ${MARKS.kiara}/${MAX}`);
    const inputs = await page.locator('[aria-label="Mark for Aadhya Rao"]').count();
    if (inputs > 0) throw new Error("published row still shows an editable input");
  });
  await step("API verifies 3 published rows (44, 48, 39) via parent results + entry view", async () => {
    const er = (await api("GET", `${API}/marks/results/examination/${examId}?view=entry`, adminTok)).json;
    for (const [id, score] of [[1, MARKS.aadhya], [7, MARKS.anaya], [13, MARKS.kiara]]) {
      const row = er.results.find((r) => r.student_id === id);
      if (!row) throw new Error(`student ${id} missing from entry view`);
      expectEq(String(row.subjects[0]?.score), score, `student ${id} score`);
      expectEq(row.subjects[0]?.workflow_status, "published", `student ${id} workflow`);
    }
    const parentTok = await loginToken(...CREDS.parent);
    for (const [id, score, pct] of [[1, MARKS.aadhya, "88"], [13, MARKS.kiara, "78"]]) {
      const pr = (await api("GET", `${API}/marks/results/student/${id}`, parentTok)).json;
      const examRow = (pr.examinations || []).find((e) => e.exam_id === examId);
      if (!examRow) throw new Error(`exam ${examId} not in parent results for student ${id}`);
      expectEq(String(examRow.obtained), score, `student ${id} parent obtained`);
      expectEq(String(Math.round(examRow.percentage)), pct, `student ${id} parent pct`);
    }
  });

  // ---------- 4. parent sees schedule + results ----------
  journey = "parent";
  await step("parent opens marks page: examination schedule card shows new session", async () => {
    await login(...CREDS.parent);
    await page.goto(`${BASE}/parent/marks`);
    await expectText("Examination schedule");
    const card = page.locator(".card").filter({ hasText: /examination schedule/i });
    const txt = await card.innerText();
    if (!txt.includes(EXAM_NAME)) throw new Error(`exam missing from schedule: ${txt.slice(0, 300)}`);
    if (!txt.includes(subj1Name)) throw new Error(`subject missing: ${txt.slice(0, 300)}`);
    if (!/19 Dec,? 2026/i.test(txt)) throw new Error(`date missing: ${txt.slice(0, 300)}`);
    if (!txt.includes("Hall A")) throw new Error(`venue missing: ${txt.slice(0, 300)}`);
    if (!txt.includes(`max ${MAX}`)) throw new Error(`max marks missing: ${txt.slice(0, 300)}`);
    if (!/09:00.*11:00/.test(txt)) throw new Error(`times missing: ${txt.slice(0, 300)}`);
    await shot("parent-schedule");
  });
  await step("child Aadhya: published result 44/50 · 88% · Grade A in aggregate + exam line", async () => {
    const trig = page.locator("#parent-child-select");
    if (await trig.count()) {
      await trig.click();
      const opt = page.getByRole("option").filter({ hasText: "Aadhya Rao" });
      await opt.first().click();
    }
    await expectText(`${EXAM_NAME}`);
    await expectText(new RegExp(`${EXAM_NAME} · ${MARKS.aadhya}/${MAX} \\(88%\\) · Grade A`), 8000); // examination line
    await expectText(/116\/150 · 77\.33%/, 8000); // summary aggregate (seed 72 + new 44)
    const row = page.locator(".listitem").filter({ hasText: subj1Name }).filter({ hasText: `${MARKS.aadhya}/${MAX} · ` }).first();
    await row.waitFor({ timeout: 6000 });
    await shot("parent-aadhya-results");
  });
  await step("child Kiara: published result 39/50 · 78% · Grade B", async () => {
    const trig = page.locator("#parent-child-select");
    await trig.click();
    const opt = page.getByRole("option").filter({ hasText: "Kiara Kapoor" });
    await opt.first().click();
    await expectText(`${EXAM_NAME}`);
    await expectText(new RegExp(`${EXAM_NAME} · ${MARKS.kiara}/${MAX} \\(78%\\) · Grade B`), 8000);
    await expectText(/89\/150 · 59\.33%/, 8000);
    await shot("parent-kiara-results");
  });
  await step("refresh: schedule + published results persist", async () => {
    await page.reload();
    await expectText("Examination schedule");
    const card = page.locator(".card").filter({ hasText: /examination schedule/i });
    const txt = await card.innerText();
    if (!txt.includes(EXAM_NAME)) throw new Error("schedule lost after refresh");
    await expectText(`${EXAM_NAME}`);
    await expectText(/89\/150 · 59\.33%/, 8000);
  });

  // ---------- 5. admin promotes one student ----------
  journey = "admin-promote";
  await step("solo promote card: Aadhya Rao → Grade II in 2027-28 committed", async () => {
    await login(...CREDS.admin);
    await page.goto(`${BASE}/admin/promotion`);
    await expectText("Promote one student");
    await pick("Target year for single promotion", "2027-28");
    await pick("Student's current class", clsName);
    await pick("Student to promote", "Aadhya Rao (BH-0001)");
    await expectText(/published results: 116\/150 · 77\.33%/, 8000); // record = all published session marks
    await pick("Destination class", destClassName);
    await expectToast(
      "Promotion saved",
      () => page.getByRole("button", { name: "Save promotion" }).click(),
    );
    await expectText("Batches");
    await expectText(/Batch #\d+[\s\S]{0,80}applied 1/, 8000);
    await shot("admin-solo-promotion");
  });
  await step("API verifies: Aadhya now class 2; 1 committed batch with 1 applied", async () => {
    const students = (await api("GET", `${API}/students?class_id=2`, adminTok)).json;
    const in2 = (Array.isArray(students) ? students : []).find((s) => s.student_id === 1);
    if (!in2) throw new Error("Aadhya not in Grade II after promotion (API)");
    const batches = (await api("GET", `${API}/promotions/batches`, adminTok)).json;
    const list = Array.isArray(batches) ? batches : batches?.items ?? [];
    expectEq(list.length, 1, "promotion batch count");
    expectEq(list[0].applied, 1, "batch applied count");
  });
  await step("re-promoting the same student is refused with clear error", async () => {
    await page.goto(`${BASE}/admin/promotion`);
    await expectText("Promote one student");
    await pick("Target year for single promotion", "2027-28");
    await pick("Student's current class", destClassName);
    await pick("Student to promote", "Aadhya Rao (BH-0001)");
    await pick("Destination class", "Grade III");
    await expectToast(
      /already enrolled/i,
      () => page.getByRole("button", { name: "Save promotion" }).click(),
      10000,
    );
    await shot("admin-repromote-refused");
  });
  await step("refresh: batch history persists; no extra batch created", async () => {
    await page.reload();
    await expectText(/Batch #\d+[\s\S]{0,80}applied 1/, 8000);
    const batches = (await api("GET", `${API}/promotions/batches`, adminTok)).json;
    const list = Array.isArray(batches) ? batches : batches?.items ?? [];
    expectEq(list.length, 1, "batch count after re-promote attempt");
  });

  // ---------- isolation ----------
  journey = "isolation";
  await step("school2 flag still OFF; zero uncaught page errors", async () => {
    const gvTokR = await api("POST", `${API}/auth/login`, null, { username: CREDS.gv[0], password: CREDS.gv[1] });
    const r = await api("GET", `${API}/examinations`, gvTokR.json?.access_token);
    expectEq(r.status, 403, "school2 examinations status");
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
  fs.writeFileSync(path.join(SHOTS, "..", "workflow-results.json"), JSON.stringify({ byJourney, results, pageErrors }, null, 2));
  console.log("\n===== WORKFLOW E2E SUMMARY =====");
  console.log(JSON.stringify(byJourney));
  console.log(`TOTAL ${passed}/${results.length} passed`);
  for (const f of failed) console.log(`  FAIL [${f.journey}] ${f.n} ${f.name} — ${f.err}`);

  await browser.close();
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("E2E runner crashed:", err);
  process.exit(2);
});
