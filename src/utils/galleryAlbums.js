// Albums are not a server concept. The gallery API returns a flat list of media,
// each carrying its own `title`, and the album is assembled on the client from
// everything sharing a title. Two media sharing a title form an album; one on
// its own is shown as a plain tile.

/** The group key a media item belongs to. Untitled media groups under its id,
 *  so two untitled uploads never collapse into one album by accident. */
export function albumKeyOf(item) {
  return item?.title || `Untitled ${item?.media_id}`;
}

/** Media with no `file_url` has nothing to show and is dropped entirely. */
export function buildGalleryCards(data) {
  const groups = new Map();
  (data || []).forEach((item) => {
    if (!item?.file_url) return;
    const key = albumKeyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const cards = [];
  // A Map preserves insertion order, so cards come back in the order the API
  // first introduced each album. A plain object would reorder integer-like
  // titles ("2026", "12") ahead of the rest.
  groups.forEach((groupItems, title) => {
    groupItems.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (groupItems.length >= 2) {
      cards.push({
        kind: "album",
        key: `album-${title}`,
        title,
        items: groupItems,
        createdAt: groupItems[0].created_at,
      });
    } else {
      cards.push({
        kind: "single",
        key: `single-${groupItems[0].media_id}`,
        item: groupItems[0],
      });
    }
  });
  return cards;
}

/** Every media id in a card, so removing an album removes all of its media.
 *  An album card has no `media_id` of its own -- only single tiles do. */
export function mediaIdsOf(card) {
  if (!card) return [];
  if (card.kind === "album") return (card.items || []).map((it) => it.media_id);
  return card.item?.media_id ? [card.item.media_id] : [];
}
