import assert from "node:assert/strict";
import test from "node:test";

import { isOwnBroadcast, splitBroadcastsByAuthor } from "../src/utils/broadcastAuthor.js";

// The split used to be `senderNameOf(item) === myName`, which compared the
// sender's display name against the signed-in user's. Those come from different
// places: the server derives sender_name from the Staff record (falling back to
// the literal string "Admin"), while myName came from the user account. They
// routinely disagree, and when they did nothing matched and every broadcast
// landed in Received. These tests pin the identity-based rule that replaced it.

const admin = { userId: 322, role: "admin", username: "ravi.gupta", name: "Ravi Gupta" };
const otherAdmin = { userId: 323, role: "admin", username: "ravi.gupta2", name: "Ravi Gupta" };

test("a broadcast you sent is Posted, and one you did not is Received", () => {
  const { posted, received } = splitBroadcastsByAuthor(
    [
      { broadcast_id: 1, sender_user_id: 322, sender_name: "Admin", message: "mine" },
      { broadcast_id: 2, sender_user_id: 323, sender_name: "Admin", message: "theirs" },
    ],
    admin
  );
  assert.deepEqual(posted.map((b) => b.broadcast_id), [1]);
  assert.deepEqual(received.map((b) => b.broadcast_id), [2]);
});

test("two admins who both post as 'Admin' stay in their own columns", () => {
  // This is the case the name could never get right: both rows carry the same
  // label, so matching on it files one admin's messages under the other's --
  // or, when the names differ at all, under neither.
  const feed = [
    { broadcast_id: 10, sender_user_id: 322, sender_name: "Admin" },
    { broadcast_id: 11, sender_user_id: 323, sender_name: "Admin" },
  ];
  assert.deepEqual(splitBroadcastsByAuthor(feed, admin).posted.map((b) => b.broadcast_id), [10]);
  assert.deepEqual(splitBroadcastsByAuthor(feed, otherAdmin).posted.map((b) => b.broadcast_id), [11]);
});

test("the id decides even when the label contradicts it", () => {
  // A renamed staff record, or a label the server rendered differently, must not
  // move a message between columns.
  assert.equal(isOwnBroadcast({ sender_user_id: 322, sender_name: "A. Renamed" }, admin), true);
  assert.equal(isOwnBroadcast({ sender_user_id: 323, sender_name: "Ravi Gupta" }, admin), false);
});

test("a row written before authorship was recorded falls back to the label", () => {
  // Legacy rows carry no id. Falling back to the name is the guess that was
  // wrong, but it is the only thing left for those rows, and defaulting them all
  // to Received would put the whole history in one column.
  assert.equal(isOwnBroadcast({ sender_name: "Ravi Gupta" }, admin), true);
  assert.equal(isOwnBroadcast({ sender_name: "Someone Else" }, admin), false);
});

test("the fallback ignores stray spacing and capitalisation", () => {
  assert.equal(isOwnBroadcast({ sender_name: "  ravi gupta " }, { ...admin, name: "Ravi Gupta" }), true);
  assert.equal(isOwnBroadcast({ sender_name: "RAVI GUPTA" }, { ...admin, name: "Ravi Gupta" }), true);
});

test("an id on the row is used even when the names line up", () => {
  // Same name, different people: the id wins, so a colleague who happens to
  // share a display name cannot claim your message.
  assert.equal(isOwnBroadcast({ sender_user_id: 323, sender_name: "Ravi Gupta" }, admin), false);
});

test("a user with no id owns nothing", () => {
  // Better to show every row as Received than to hand one person the whole feed
  // because their session was half-built.
  for (const broken of [null, undefined, {}, { userId: 0 }, { userId: null }, { userId: "abc" }]) {
    assert.equal(isOwnBroadcast({ sender_user_id: 322 }, broken), false,
      `${JSON.stringify(broken)} should own nothing`);
    assert.equal(isOwnBroadcast({ sender_name: "Admin" }, broken), false);
  }
});

test("a malformed id is treated as no id rather than as id zero", () => {
  // `??` only catches null/undefined; a 0 or a string from a loose API would
  // otherwise compare as a real user id.
  assert.equal(isOwnBroadcast({ sender_user_id: 0 }, admin), false);
  assert.equal(isOwnBroadcast({ sender_user_id: "322" }, admin), true, "a numeric string is still that id");
  assert.equal(isOwnBroadcast({ sender_user_id: "abc" }, admin), false);
  assert.equal(isOwnBroadcast({ sender_user_id: -5 }, admin), false);
});

test("an empty feed splits into two empty columns", () => {
  for (const empty of [[], null, undefined]) {
    const { posted, received } = splitBroadcastsByAuthor(empty, admin);
    assert.deepEqual(posted, []);
    assert.deepEqual(received, []);
  }
});

test("the split keeps the order it was given, and loses nothing", () => {
  const feed = [
    { broadcast_id: 3, sender_user_id: 323 },
    { broadcast_id: 1, sender_user_id: 322 },
    { broadcast_id: 2, sender_name: "Old row" },
    { broadcast_id: 4, sender_user_id: 322 },
  ];
  const { posted, received } = splitBroadcastsByAuthor(feed, admin);
  assert.deepEqual(posted.map((b) => b.broadcast_id), [1, 4]);
  assert.deepEqual(received.map((b) => b.broadcast_id), [3, 2]);
  // Every row lands in exactly one column.
  assert.equal(posted.length + received.length, feed.length);
});
