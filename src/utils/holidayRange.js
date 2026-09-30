// A holiday range is not a server concept either. The API stores one row per
// calendar day (so the timetable can resolve any single date on its own), and a
// multi-day break arrives as several rows sharing one `occasion`. The portal
// collapses consecutive same-named days back into the single entry the admin
// typed, so "Diwali, 8-11 Nov" is one row rather than four identical ones.
//
// The grouping rule here must match `holiday_group` in the academics service,
// which is what a range edit or delete acts on.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a `YYYY-MM-DD` string as a local date, or null if it is not one.
 *  `new Date("2026-11-08")` is parsed as UTC and then formatted back in local
 *  time, which shifts the day for anyone west of Greenwich. Splitting the parts
 *  avoids that, and noon is used so a daylight-saving jump cannot move it. */
export function parseHolidayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0);
  // The Date constructor rolls impossible parts over ("2026-13-01" becomes
  // January 2027), which would silently shift a range. Round-tripping the
  // components is the only way to tell a real date from a rolled-over one.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/** Whole days from `from` to `to`; negative if `to` is earlier. */
export function daysBetween(from, to) {
  return Math.round((to - from) / DAY_MS);
}

/** The number of days a span covers, counting both ends. A reversed span is 0
 *  rather than negative, so callers never display a nonsensical length. */
export function rangeLength(startIso, endIso) {
  const start = parseHolidayDate(startIso);
  const end = parseHolidayDate(endIso ?? startIso);
  if (!start || !end) return 0;
  return Math.max(0, daysBetween(start, end) + 1);
}

/** Collapse dated holiday rows into runs of consecutive days sharing an occasion.
 *
 *  A gap starts a new entry. Grouping across one would mark a school day closed
 *  that nobody asked for, which is the one mistake a holiday list must not make.
 *  Rows are sorted by date here so an API reordering cannot split a break. */
export function groupHolidayRows(rows) {
  const sorted = [...(rows || [])]
    .filter((row) => row?.holiday_date && row?.occasion)
    .sort((a, b) => parseHolidayDate(a.holiday_date) - parseHolidayDate(b.holiday_date));

  const groups = [];
  sorted.forEach((row) => {
    const previous = groups[groups.length - 1];
    if (previous) {
      const gap = daysBetween(parseHolidayDate(previous.end), parseHolidayDate(row.holiday_date));
      if (gap === 1 && previous.occasion === row.occasion) {
        previous.end = row.holiday_date;
        previous.ids.push(row.holiday_id);
        previous.days += 1;
        return;
      }
    }
    groups.push({
      occasion: row.occasion,
      start: row.holiday_date,
      end: row.holiday_date,
      // The anchor is the first day's id: a range edit or delete addressed to any
      // day of the break reaches the whole thing server-side, so the portal can
      // act on the row the admin clicked without tracking every id.
      anchor_id: row.holiday_id,
      ids: [row.holiday_id],
      days: 1,
    });
  });
  return groups;
}

const SAME_MONTH = { month: "short", day: "numeric" };
const WITH_YEAR = { month: "short", day: "numeric", year: "numeric" };

/** "8 Nov 2026" for one day, "8 - 11 Nov 2026" for a span within a month, and
 *  "30 Nov 2026 - 2 Jan 2027" when it crosses one. */
export function formatHolidaySpan(startIso, endIso) {
  const start = parseHolidayDate(startIso);
  const end = parseHolidayDate(endIso ?? startIso);
  if (!start || !end) return "";
  if (startIso === endIso || !endIso) {
    return start.toLocaleDateString("en-GB", WITH_YEAR);
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const left = start.toLocaleDateString("en-GB", sameYear ? SAME_MONTH : WITH_YEAR);
  const right = end.toLocaleDateString("en-GB", WITH_YEAR);
  return `${left} - ${right}`;
}

/** "1 day" / "4 days", for the row summary and the delete confirmation. */
export function formatHolidayLength(days) {
  return days === 1 ? "1 day" : `${days} days`;
}
