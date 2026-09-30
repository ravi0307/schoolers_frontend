import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { albumKeyOf, buildGalleryCards, mediaIdsOf } from "../src/utils/galleryAlbums.js";

const root = path.resolve(".");
function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

let seq = 0;
function media(overrides = {}) {
  seq += 1;
  return {
    media_id: seq,
    title: "Annual day",
    file_url: `/media/${seq}.jpg`,
    media_kind: "image",
    created_at: `2026-09-0${(seq % 9) + 1}T10:00:00`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Album assembly
//
// Albums do not exist server-side. The API returns a flat list and the album is
// assembled here from everything sharing a title.
// ---------------------------------------------------------------------------

test("media sharing a title are gathered into one album", () => {
  const cards = buildGalleryCards([
    media({ title: "Annual day" }),
    media({ title: "Annual day" }),
    media({ title: "Annual day" }),
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "album");
  assert.equal(cards[0].items.length, 3);
});

test("a lone titled item is a single tile, not a one-photo album", () => {
  const cards = buildGalleryCards([media({ title: "Solo" })]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "single");
  assert.equal(cards[0].item.title, "Solo");
});

test("titles keep their own albums apart", () => {
  const cards = buildGalleryCards([
    media({ title: "Annual day" }),
    media({ title: "Annual day" }),
    media({ title: "Sports day" }),
    media({ title: "Sports day" }),
  ]);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((c) => c.title).sort(), ["Annual day", "Sports day"]);
  assert.ok(cards.every((c) => c.items.length === 2));
});

test("media with no file_url is dropped rather than shown as a broken tile", () => {
  const cards = buildGalleryCards([
    media({ title: "Annual day" }),
    media({ title: "Annual day", file_url: null }),
  ]);
  assert.equal(cards.length, 1);
  // One survivor is no longer an album.
  assert.equal(cards[0].kind, "single");
  assert.ok(cards[0].item.file_url);
});

test("an album drops to a single tile when only one of its media survives", () => {
  const cards = buildGalleryCards([
    media({ title: "Trip" }),
    media({ title: "Trip", file_url: "" }),
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "single");
  assert.equal(cards[0].items, undefined);
  assert.equal(cards[0].item.title, "Trip");
});

test("untitled media group under their own id and never merge", () => {
  const cards = buildGalleryCards([
    media({ title: null, media_id: 71 }),
    media({ title: "", media_id: 72 }),
    media({ title: null, media_id: 73 }),
  ]);
  assert.equal(cards.length, 3);
  assert.ok(cards.every((c) => c.kind === "single"));
});

test("an untitled pair sharing an id does become an album", () => {
  // The same row twice, e.g. a duplicated page of results.
  const cards = buildGalleryCards([
    media({ title: null, media_id: 71 }),
    media({ title: null, media_id: 71 }),
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "album");
});

test("albumKeyOf falls back to the id only when there is no title", () => {
  assert.equal(albumKeyOf({ title: "Annual day", media_id: 5 }), "Annual day");
  assert.equal(albumKeyOf({ title: "", media_id: 5 }), "Untitled 5");
  assert.equal(albumKeyOf({ title: null, media_id: 5 }), "Untitled 5");
  assert.equal(albumKeyOf({}), "Untitled undefined");
});

test("an album's items are ordered oldest first", () => {
  const cards = buildGalleryCards([
    media({ title: "Trip", created_at: "2026-09-05T10:00:00" }),
    media({ title: "Trip", created_at: "2026-09-01T10:00:00" }),
    media({ title: "Trip", created_at: "2026-09-03T10:00:00" }),
  ]);
  assert.deepEqual(
    cards[0].items.map((it) => it.created_at.slice(8, 10)),
    ["01", "03", "05"]
  );
  // The album's own timestamp is its oldest photo's, so the grid sorts sensibly.
  assert.equal(cards[0].createdAt, "2026-09-01T10:00:00");
});

test("cards come back in the order each album first appeared", () => {
  // Integer-like keys are the trap: as object keys they would be reordered
  // ahead of everything else, so the grid would silently reshuffle.
  const cards = buildGalleryCards([
    media({ title: "Zebra" }),
    media({ title: "Zebra" }),
    media({ title: "2026" }),
    media({ title: "2026" }),
    media({ title: "12" }),
    media({ title: "12" }),
  ]);
  assert.deepEqual(cards.map((c) => c.title), ["Zebra", "2026", "12"]);
});

test("every media lands in exactly one card", () => {
  const input = [
    media({ title: "A" }), media({ title: "A" }),
    media({ title: "B" }),
    media({ title: "C" }), media({ title: "C" }), media({ title: "C" }),
  ];
  const cards = buildGalleryCards(input);
  const seen = cards.flatMap((c) => (c.kind === "album" ? c.items : [c.item])).map((i) => i.media_id);
  assert.equal(seen.length, input.length);
  assert.equal(new Set(seen).size, input.length);
});

test("an empty or missing gallery yields no cards", () => {
  assert.deepEqual(buildGalleryCards([]), []);
  assert.deepEqual(buildGalleryCards(null), []);
  assert.deepEqual(buildGalleryCards(undefined), []);
});

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------

test("removing an album deletes every media in it", () => {
  // The bug: an album card has no media_id of its own, so the delete call was
  // made with undefined and removed nothing.
  const [album] = buildGalleryCards([media({ title: "Trip" }), media({ title: "Trip" })]);
  assert.equal(album.media_id, undefined);
  assert.deepEqual(mediaIdsOf(album), album.items.map((it) => it.media_id));
  assert.equal(mediaIdsOf(album).length, 2);
});

test("removing a single tile deletes just that one", () => {
  const [single] = buildGalleryCards([media({ title: "Solo" })]);
  assert.deepEqual(mediaIdsOf(single), [single.item.media_id]);
});

test("removing nothing asks for no deletes", () => {
  assert.deepEqual(mediaIdsOf(null), []);
  assert.deepEqual(mediaIdsOf({}), []);
  assert.deepEqual(mediaIdsOf({ kind: "album", items: [] }), []);
  assert.deepEqual(mediaIdsOf({ kind: "single", item: {} }), []);
});

// ---------------------------------------------------------------------------
// GalleryView wiring
// ---------------------------------------------------------------------------

test("an expanded album is not gated behind delete permission", () => {
  // The reported bug. Only admins pass canDelete, so gating the expanded panel
  // on it left parents and teachers clicking an album with nothing happening.
  const text = source("src/components/gallery/GalleryView.jsx");
  assert.doesNotMatch(text, /isExpanded\s*&&\s*canDelete/);
  assert.match(text, /\{isExpanded\s*&&\s*\(\s*<div className="album-detail">/);
});

test("only admins are offered the remove button", () => {
  // The gate was right for the ✕ and wrong for the panel; it must not be lost.
  const text = source("src/components/gallery/GalleryView.jsx");
  const removeButtons = text.match(/\{canDelete\s*&&\s*\(\s*<button[^>]*gallery-tile-remove/g) || [];
  assert.ok(removeButtons.length >= 3, `expected canDelete to gate each remove button, found ${removeButtons.length}`);
});

test("both album items and single tiles open the full-size viewer", () => {
  const text = source("src/components/gallery/GalleryView.jsx");
  assert.match(text, /openViewer\(card\.items,\s*itemIndex\)/);
  assert.match(text, /openViewer\(\[it\],\s*0\)/);
  assert.match(text, /<MediaLightbox/);
});

test("the album heading is reachable by keyboard, not by mouse alone", () => {
  const text = source("src/components/gallery/GalleryView.jsx");
  assert.match(text, /className="gallery-album-head"[\s\S]{0,200}?role="button"/);
  assert.match(text, /className="gallery-album-head"[\s\S]{0,300}?tabIndex=\{0\}/);
  assert.match(text, /className="gallery-album-head"[\s\S]{0,400}?aria-expanded=\{isExpanded\}/);
});

test("removing an album goes through mediaIdsOf, not a single id", () => {
  // An album card has no media_id of its own. Reading one straight off the card
  // sends /media/undefined and removes nothing, so the ids must come from the
  // helper that knows albums are a list of media.
  const text = source("src/components/gallery/GalleryView.jsx");
  assert.match(text, /mediaIdsOf\(pendingDelete\.item\)/);
  assert.doesNotMatch(text, /\[pendingDelete\.item\.media_id\]/);
  assert.doesNotMatch(text, /pendingDelete\.item\.media_id\s*\)\s*;/);
});

test("parent and teacher galleries are the roles that hit the bug", () => {
  // Both render GalleryView without canDelete, which is exactly why gating the
  // expanded album on it broke them. Admin passes it, so admins never noticed.
  assert.doesNotMatch(source("src/pages/parent/ParentGallery.jsx"), /canDelete/);
  assert.doesNotMatch(source("src/pages/teacher/TeacherGallery.jsx"), /canDelete/);
  assert.match(source("src/pages/admin/AdminGallery.jsx"), /canDelete/);
});

// ---------------------------------------------------------------------------
// The viewer itself
// ---------------------------------------------------------------------------

test("the viewer closes on Escape and pages with the arrow keys", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /event\.key === "Escape"/);
  assert.match(text, /event\.key === "ArrowRight"/);
  assert.match(text, /event\.key === "ArrowLeft"/);
});

test("the viewer wraps around at both ends instead of dead-ending", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /\(index \+ delta \+ list\.length\) % list\.length/);
});

test("the viewer is modal and labelled for assistive tech", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /role="dialog"/);
  assert.match(text, /aria-modal="true"/);
});

test("the viewer stops the page scrolling behind it and restores it on close", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /document\.body\.style\.overflow = "hidden"/);
  assert.match(text, /document\.body\.style\.overflow = previousOverflow/);
});

test("a video plays inside the viewer, not in the grid", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /<video className="media-viewer-media"[^>]*controls/);
  // The grid tile must stay a plain click target, so it carries no controls.
  const view = source("src/components/gallery/GalleryView.jsx");
  assert.doesNotMatch(view, /<video[^>]*className="(?:album-)?media"[^>]*controls/);
});

test("the viewer shows which photo you are on when there is more than one", () => {
  const text = source("src/components/gallery/MediaLightbox.jsx");
  assert.match(text, /\{index \+ 1\} of \{list\.length\}/);
});
