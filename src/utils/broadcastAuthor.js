/**
 * Who wrote a broadcast, for the Posted/Received split.
 *
 * The admin and teacher broadcast pages each show two columns: what you sent,
 * and what everyone else sent. Deciding that by comparing display names is what
 * put every message in Received: the server stores `sender_name` as a label it
 * derives itself, and it is not the name on the signed-in account. An admin
 * account with no linked staff record posts as the literal string "Admin", so
 * the page compared `"Admin"` against its own name, nothing matched, and the
 * whole feed fell into the other column.
 *
 * Names cannot answer the question even when they happen to line up. Two admins
 * in one school both post as "Admin", so their messages are indistinguishable;
 * and a rename would silently re-file history. The author's user id can, so
 * that is what this asks for first.
 *
 * Rows written before authorship was recorded carry no id. They are attributed
 * by name, which is the guess that was wrong -- but for those rows it is the
 * only thing available, and leaving them all in Received is no better.
 */

function senderIdOf(item) {
  const raw = item?.sender_user_id ?? item?.senderUserId ?? item?.senderId;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function senderNameOf(item) {
  return String(item?.sender_name || item?.senderName || item?.from_name || "").trim();
}

/**
 * True when `item` was authored by `user`.
 *
 * `user` is the object from the auth context, which carries `userId`. A user
 * with no id cannot own anything, and is told so rather than being handed every
 * unowned row.
 */
export function isOwnBroadcast(item, user) {
  const mine = Number(user?.userId);
  if (!Number.isInteger(mine) || mine <= 0) return false;

  const author = senderIdOf(item);
  if (author !== null) return author === mine;

  // No id on the row: fall back to the label, matched loosely so a stray space
  // or a different capitalisation does not push a message into the wrong column.
  const theirs = senderNameOf(item);
  if (!theirs) return false;
  const mineName = String(user?.name || user?.fullName || user?.username || "").trim();
  if (!mineName) return false;
  return theirs.toLowerCase() === mineName.toLowerCase();
}

/** Splits a feed into what this user sent and what they did not, in one pass. */
export function splitBroadcastsByAuthor(broadcasts, user) {
  const posted = [];
  const received = [];
  for (const item of broadcasts || []) {
    (isOwnBroadcast(item, user) ? posted : received).push(item);
  }
  return { posted, received };
}
