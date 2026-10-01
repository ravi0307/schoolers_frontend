/**
 * Filtering and sorting for the accounts grids.
 *
 * Both are client-side and deliberately so. The API already returns every
 * active person for the window, the counts are in the hundreds at most, and
 * filtering on each keystroke is what an admin expects from a name box. The
 * trade-off is that the filter is scoped to the loaded window, not the whole
 * school -- re-querying per keystroke would make typing a name feel slow and
 * would drop the "unpaid" view, which cannot be expressed as a server query
 * at all.
 *
 * A row's total is the sum across the visible months only. Sorting by it
 * therefore sorts by the window on screen, which is the only window the admin
 * is looking at.
 */

/** 'YYYY-MM' values the grid renders, used to scope a row's total. */
export function visibleMonths(sheet) {
  return sheet?.months || [];
}

/** Sum of a row's recorded amounts across the visible months. */
export function rowTotal(row, months) {
  return months.reduce((sum, month) => sum + (row?.amounts?.[month] || 0), 0);
}

/** How many of the visible months have an entry for this row. */
export function rowPaidMonths(row, months) {
  return months.filter((month) => row?.amounts?.[month] != null).length;
}

export const STAFF_SORTS = {
  name: { label: "Name (A–Z)" },
  name_desc: { label: "Name (Z–A)" },
  total_desc: { label: "Highest paid" },
  total_asc: { label: "Lowest paid" },
  unpaid_desc: { label: "Most unpaid months" },
  unpaid_asc: { label: "Fewest unpaid months" },
};

/** Case-insensitive match across the name and the secondary line. */
function matches(row, query, extractors) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return extractors.some((extract) =>
    String(extract(row) || "").toLowerCase().includes(needle)
  );
}

function byName(a, b, nameOf, direction) {
  // localeCompare so accented and non-Latin names order the way an admin
  // expects, rather than by code point.
  return nameOf(a).localeCompare(nameOf(b)) * direction;
}

/** Ascending numeric compare; pass direction = -1 to reverse it. */
function byNumber(a, b, pick, direction = 1) {
  return (pick(a) - pick(b)) * direction;
}

export function filterAndSortRows({
  rows,
  months,
  query,
  sort,
  nameOf,
  secondaryOf,
}) {
  const filtered = rows.filter((row) => matches(row, query, [nameOf, secondaryOf]));

  const total = (row) => rowTotal(row, months);
  const unpaid = (row) => months.length - rowPaidMonths(row, months);

  const sorted = [...filtered];
  switch (sort) {
    case "name_desc":
      sorted.sort((a, b) => byName(a, b, nameOf, -1));
      break;
    case "total_desc":
      sorted.sort((a, b) => byNumber(a, b, total, -1) || byName(a, b, nameOf, 1));
      break;
    case "total_asc":
      sorted.sort((a, b) => byNumber(a, b, total, 1) || byName(a, b, nameOf, 1));
      break;
    case "unpaid_desc":
      sorted.sort((a, b) => byNumber(a, b, unpaid, -1) || byName(a, b, nameOf, 1));
      break;
    case "unpaid_asc":
      sorted.sort((a, b) => byNumber(a, b, unpaid, 1) || byName(a, b, nameOf, 1));
      break;
    case "name":
    default:
      sorted.sort((a, b) => byName(a, b, nameOf, 1));
      break;
  }
  return sorted;
}

/**
 * Rows a grid shows at once before it scrolls.
 *
 * Eight rows clears an active roster of a small-to-mid school (eight staff,
 * or the whole student roll at this demo's size) without ever needing the
 * scroll, while still keeping the sticky header, the period selector and the
 * summary line in one screen's worth of attention. Past that, scrolling beats
 * a paginated page because the comparison an admin is making is vertical —
 * "who else has nothing in May".
 */
export const VISIBLE_ROWS = 8;

/** How many rows precede `visible` in the full list, for a "showing X of Y" note. */
export function scrollHint(total, visible = VISIBLE_ROWS) {
  return total > visible ? total - visible : 0;
}

/**
 * The "N of M people" note above a grid.
 *
 * Only mentions the total once the view is actually narrowed. A grid showing
 * every name needs no arithmetic, and printing "16 of 16 staff" on load reads
 * as though a filter is already applied.
 */
export function peopleCountLabel({ matched, total, singular, plural }) {
  const word = total === 1 ? singular : plural;
  // Build the count and the noun separately, then join once. Doing it inline
  // with a trailing space in the branch is what produced "1 of 16  students".
  const count = matched === total ? String(total) : `${matched} of ${total}`;
  return `${count} ${word}`;
}

/**
 * "scroll for N more", or null when the grid fits.
 *
 * Returns null rather than an empty string so the caller can skip the element
 * entirely instead of leaving a bare separator with no text.
 */
export function scrollHintText(total, visible = VISIBLE_ROWS) {
  const hidden = scrollHint(total, visible);
  return hidden > 0 ? `scroll for ${hidden} more` : null;
}
