const ROLE_IDS = {
  admin: { userId: 1, linkedPersonId: 1, name: "Ravi Admin" },
  staff: { userId: 2, linkedPersonId: 2, name: "Sam Staff" },
  teacher: { userId: 4, linkedPersonId: 4, name: "Anita Teacher" },
  parent: { userId: 3, linkedPersonId: 3, name: "Ravi Parent" },
  master: { userId: 9, linkedPersonId: null, name: "Maya Master" },
};

export const TARGET_WIDTHS = [390, 768, 1440];

export const CLASSES = [
  { class_id: 1, name: "Grade 5 - A", class_teacher_id: 11 },
  { class_id: 2, name: "Grade 6 - B", class_teacher_id: null },
];

const TEACHERS = [
  { teacher_id: 11, name: "Anita Teacher", role_title: "Teacher" },
  { teacher_id: 12, name: "Dev Teacher", role_title: "Teacher" },
];

const STAFF = [
  {
    staff_id: 21,
    name: "Kiran Office",
    role_title: "Office assistant",
    phone: "9876543210",
    email: "kiran@example.test",
    date_of_birth: "1987-04-12",
    marital_status: "Married",
    gender: "Female",
    emergency_contact: "9876500000",
    aadhaar_number: "123456789012",
  },
];

const STUDENTS = [
  {
    student_id: 10,
    name: "Aarav Sharma",
    admission_no: "BHA-010",
    class_id: 1,
    present_today: true,
    date_of_birth: "2015-08-19",
    gender: "Male",
    parent_name: "Ravi Parent",
    parent_phone: "9876501234",
    parent_email: "parent@example.test",
  },
  {
    student_id: 11,
    name: "Mira Sharma",
    admission_no: "BHA-011",
    class_id: 2,
    present_today: false,
    date_of_birth: "2016-02-04",
    gender: "Female",
    parent_name: "Ravi Parent",
  },
];

const BROADCASTS = [
  {
    broadcast_id: 101,
    sender_user_id: 1,
    sender_name: "Ravi Admin",
    role_name: "School Admin",
    scope: "school",
    message: "Welcome back to Blue Horizon Academy.",
    created_at: "2026-10-12T08:00:00Z",
  },
  {
    broadcast_id: 102,
    sender_user_id: 4,
    sender_name: "Anita Teacher",
    role_name: "Teacher",
    scope: "class",
    class_id: 1,
    message: "Grade 5 homework is due Friday.",
    created_at: "2026-10-11T08:00:00Z",
  },
  {
    broadcast_id: 103,
    sender_user_id: 2,
    sender_name: "Sam Staff",
    role_name: "Staff",
    scope: "route",
    route_id: 7,
    message: "Route 7 leaves at 7:30 tomorrow.",
    created_at: "2026-10-10T08:00:00Z",
  },
];

const ROUTES = [{ route_id: 7, name: "North Loop" }];

const CHILDREN = [
  { student_id: 10, name: "Aarav Sharma", admission_no: "BHA-010", class_id: 1, present_today: true },
  { student_id: 11, name: "Mira Sharma", admission_no: "BHA-011", class_id: 2, present_today: false },
];

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthWindow(end, count = 2) {
  const [yearText, monthText] = String(end || "").split("-");
  const date = new Date(Number(yearText) || 2026, (Number(monthText) || 10) - 1, 1);
  const months = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const value = new Date(date.getFullYear(), date.getMonth() - offset, 1);
    months.push(monthKey(value.getFullYear(), value.getMonth() + 1));
  }
  return months;
}

function sheetFor(kind, end) {
  const months = monthWindow(end);
  if (kind === "salary") {
    return {
      months,
      rows: [{
        staff_id: 21,
        staff_name: "Kiran Office",
        designation: "Office assistant",
        amounts: { [months[0]]: 28000, [months[1]]: null },
        notes: { [months[0]]: "October payroll" },
        paid_on: { [months[0]]: "2026-10-03" },
      }],
      total_paid: 28000,
      total_outstanding_months: 1,
    };
  }

  return {
    months,
    rows: [{
      student_id: 10,
      student_name: "Aarav Sharma",
      class_name: "Grade 5 - A",
      admission_no: "BHA-010",
      amounts: { [months[0]]: 12000, [months[1]]: null },
      notes: { [months[0]]: "Term 1" },
      paid_on: { [months[0]]: "2026-10-04" },
    }],
    total_collected: 12000,
    outstanding_count: 1,
  };
}

function depositPreview(request) {
  let payload = {};
  try {
    payload = request.postDataJSON() || {};
  } catch {
    // A malformed preview request is still answered deterministically below.
  }
  const start = payload.start_month || "2026-10";
  const [yearText, monthText] = start.split("-");
  const startDate = new Date(Number(yearText), (Number(monthText) || 10) - 1, 1);
  const count = payload.plan === "annual" ? 12 : payload.plan === "term" ? 3 : 1;
  const amount = Number(payload.amount) || 0;
  const perMonth = count ? Math.round((amount / count) * 100) / 100 : amount;
  const months = Array.from({ length: count }, (_, index) => {
    const value = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
    return {
      month: monthKey(value.getFullYear(), value.getMonth() + 1),
      amount: perMonth,
      replaced: false,
    };
  });
  return { plan: payload.plan || "monthly", total: amount, months, created: count, replaced: 0 };
}

function builderState() {
  return {
    draft: null,
    updated_at: null,
    published_at: null,
    published: null,
  };
}

function responseFor(pathname, request) {
  const url = new URL(request.url());
  const method = request.method();

  if (pathname.endsWith("/auth/me")) {
    const role = request.headers()["x-schoolers-test-role"] || "admin";
    const identity = ROLE_IDS[role] || ROLE_IDS.admin;
    return {
      user_id: identity.userId,
      role,
      username: `${role}-dropdown-test`,
      display_name: identity.name,
      email: `${role}@example.test`,
      school_name: role === "master" ? null : "Blue Horizon Academy",
      school_logo_url: null,
      linked_person_id: identity.linkedPersonId,
    };
  }

  if (pathname.endsWith("/broadcasts")) return BROADCASTS;
  if (pathname.endsWith("/classes")) return CLASSES;
  if (pathname.endsWith("/teachers")) return TEACHERS;
  if (pathname.endsWith("/staff")) return STAFF;
  if (pathname.endsWith("/students")) return STUDENTS;
  if (pathname.endsWith("/routes")) return ROUTES;
  if (pathname.endsWith("/parents/3/children")) return CHILDREN;
  if (/\/teachers\/\d+\/load$/.test(pathname)) {
    return [{ class_id: 1, subject_id: 1, teacher_id: 4, is_class_teacher: true }];
  }
  if (pathname.endsWith("/attendance/staff")) return [];
  if (pathname.includes("/attendance")) return [];
  if (pathname.includes("/timetable")) return [];
  if (pathname.includes("/marks")) return [];
  if (pathname.endsWith("/media")) return [];
  if (pathname.endsWith("/leave/mine") || pathname.endsWith("/leave")) return [];
  if (pathname.endsWith("/routes/mine")) return [];
  if (pathname.endsWith("/accounts/salaries")) return sheetFor("salary", url.searchParams.get("end"));
  if (pathname.endsWith("/accounts/fees")) return sheetFor("fee", url.searchParams.get("end"));
  if (pathname.endsWith("/accounts/fees/plans")) {
    return {
      plans: [
        { plan: "monthly", months: 1, label: "Monthly" },
        { plan: "term", months: 3, label: "Term" },
        { plan: "annual", months: 12, label: "Annual" },
      ],
    };
  }
  if (pathname.endsWith("/accounts/fees/deposit/preview") && method === "POST") return depositPreview(request);
  if (/\/website\/\d+$/.test(pathname)) return builderState();
  if (pathname.endsWith("/schools")) {
    return [{ school_id: 1, name: "Blue Horizon Academy", city: "Bengaluru", state: "Karnataka", status: "Active" }];
  }
  if (/\/schools\/\d+\/stats$/.test(pathname)) return {};
  if (/\/schools\/\d+$/.test(pathname)) {
    return {
      school_id: 1,
      name: "Blue Horizon Academy",
      address: "1 Academy Road",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      pincode: "560001",
      first_name: "Ravi",
      last_name: "Admin",
      primary_contact: "9876543210",
      primary_email: "admin@example.test",
      features: {},
      status: "Active",
    };
  }

  // GETs not relevant to the route under test are intentionally empty. Any
  // mutating request is also answered locally, but is recorded by the caller.
  return method === "GET" ? [] : {};
}

export function fixtureFor(role) {
  const identity = ROLE_IDS[role] || ROLE_IDS.admin;
  return {
    userId: identity.userId,
    role,
    schoolId: role === "master" ? null : 1,
    linkedPersonId: identity.linkedPersonId,
    username: `${role}-dropdown-test`,
    name: identity.name,
    displayName: identity.name,
    schoolName: role === "master" ? "" : "Blue Horizon Academy",
  };
}

export async function authenticate(context, role) {
  const writes = [];
  const user = fixtureFor(role);

  await context.addInitScript((sessionUser) => {
    localStorage.setItem("schoolers_access_token", "dropdown-test-access-token");
    localStorage.setItem("schoolers_user", JSON.stringify(sessionUser));
  }, user);

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      writes.push({ method: request.method(), url: request.url() });
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseFor(new URL(request.url()).pathname, request)),
    });
  });

  // The app cannot read custom request headers from its API client. The role
  // is already in localStorage, so auth/me is derived from this closure only
  // by installing the response route after replacing the role header locally.
  await context.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user_id: user.userId,
        role,
        username: user.username,
        display_name: user.displayName,
        email: `${role}@example.test`,
        school_name: user.schoolName || null,
        school_logo_url: null,
        linked_person_id: user.linkedPersonId,
      }),
    });
  });

  return { writes };
}

export function assertNoWrites(api, assert) {
  assert.deepEqual(api.writes, [], `browser test made mutating API requests: ${JSON.stringify(api.writes)}`);
}
